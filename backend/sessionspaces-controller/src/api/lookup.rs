//! Resolves authoritative session metadata into an active SessionSpace spec.

use super::instrument::Instrument;
use super::ispyb::{BasicInfo, DirectSubject, ProposalSubject};
use super::types::{ApiError, SessionName};
use crate::sessionspace::{Access, DesiredState, Session, SessionSpaceSpec, Storage};
use anyhow::{Context, ensure};
use axum::http::StatusCode;
use ldap3::{LdapConnAsync, Scope, SearchEntry};
use sqlx::MySqlPool;
use std::collections::BTreeSet;

const GROUP_BASE: &str = "ou=Group,dc=diamond,dc=ac,dc=uk";

struct LdapSessionData {
    gid: i64,
    members: BTreeSet<String>,
}

/// Combines ISPyB visit/membership data, LDAP GID/group members and instrument storage mappings.
/// Returns a complete spec only after all required lookups succeed; does not write to Kubernetes.
pub(super) async fn fetch(
    pool: &MySqlPool,
    ldap_url: &str,
    name: &SessionName,
) -> Result<SessionSpaceSpec, ApiError> {
    let info = BasicInfo::fetch(pool, name)
        .await
        .context("Looking up ISPyB visit")?
        .ok_or(ApiError(
            StatusCode::BAD_REQUEST,
            "Proposal/visit not found in ISPyB",
        ))?;
    let instrument = info
        .instrument
        .context("ISPyB visit has no instrument")?
        .parse::<Instrument>()
        .map_err(|_| {
            ApiError(
                StatusCode::UNPROCESSABLE_ENTITY,
                "Unknown instrument in ISPyB",
            )
        })?;
    let start_date = info.start_date.context("ISPyB visit has no start date")?;
    let end_date = info.end_date.context("ISPyB visit has no end date")?;
    let year = start_date.year();
    let data_directory = instrument.directory(year, &name.namespace).ok_or(ApiError(
        StatusCode::UNPROCESSABLE_ENTITY,
        "Instrument has no supported data directory",
    ))?;
    let mut members = DirectSubject::fetch(pool, info.session_id)
        .await
        .context("Looking up visit members")?;
    members.extend(
        ProposalSubject::fetch(pool, info.proposal_id)
            .await
            .context("Looking up proposal members")?,
    );
    let ldap_groups = instrument.ldap_groups();
    let ldap = fetch_ldap_session_data(ldap_url, &name.namespace, &ldap_groups)
        .await
        .context("Looking up LDAP access and storage")?;
    members.extend(ldap.members);

    Ok(SessionSpaceSpec {
        desired_state: DesiredState::Active,
        session: Session {
            proposal: name.proposal.clone(),
            visit: name.visit,
            instrument: instrument.to_string(),
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
        },
        storage: Storage {
            data_directory,
            gid: ldap.gid,
        },
        access: Access {
            members: members.into_iter().collect(),
        },
    })
}

/// Resolves the session GID and instrument-group members from LDAP.
async fn fetch_ldap_session_data(
    ldap_url: &str,
    namespace: &str,
    groups: &[&str],
) -> anyhow::Result<LdapSessionData> {
    let (conn, mut ldap) = LdapConnAsync::new(ldap_url)
        .await
        .context("Connecting to LDAP")?;
    ldap3::drive!(conn);
    let result = async {
        let filter = format!(
            "(&(objectClass=posixGroup)(|(cn={namespace})(cn={})))",
            namespace.replace('-', "_")
        );
        let (entries, _) = ldap
            .search(GROUP_BASE, Scope::Subtree, &filter, vec!["gidNumber"])
            .await?
            .success()?;
        ensure!(
            entries.len() == 1,
            "Expected exactly one LDAP session group"
        );
        let entry = entries
            .into_iter()
            .next()
            .context("Session group search returned no entries")?;
        let entry = SearchEntry::construct(entry);
        let gids = entry
            .attrs
            .get("gidNumber")
            .context("Session group has no gidNumber")?;
        ensure!(gids.len() == 1, "Expected one gidNumber");
        let gid: u32 = gids[0].parse().context("Invalid gidNumber")?;
        let filter = format!(
            "(&(objectClass=posixGroup)(|{}))",
            groups
                .iter()
                .map(|g| format!("(cn={g})"))
                .collect::<String>()
        );
        let (entries, _) = ldap
            .search(GROUP_BASE, Scope::Subtree, &filter, vec!["memberUid"])
            .await?
            .success()?;
        let mut members = BTreeSet::new();
        for entry in entries {
            let entry = SearchEntry::construct(entry);
            if let Some(users) = entry.attrs.get("memberUid") {
                members.extend(users.iter().filter(|u| !u.is_empty()).cloned());
            }
        }
        Ok(LdapSessionData {
            gid: i64::from(gid),
            members,
        })
    }
    .await;
    let _ = ldap.unbind().await;
    result
}
