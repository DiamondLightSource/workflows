use sqlx::{query_as, MySqlPool};
use tracing::instrument;

/// A singular beamline session
#[derive(Debug, Eq, PartialEq, PartialOrd, Ord, Clone)]
pub struct Session {
    /// The opaque identifier of the session
    pub id: u32,
    /// The proposal type code
    pub proposal_code: String,
    /// The proposal number with which this session is associated
    pub proposal_number: u32,
    /// The visit number within the proposal
    pub visit: u32,
    /// The beamline with which the session is associated
    pub beamline: String,
}

impl Session {
    /// Fetches [`Session`]s from ISPyB
    #[instrument(name = "fetch_sessions")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Vec<Self>, sqlx::Error> {
        Ok(query_as!(
            SessionRow,
            "
            SELECT
                sessionId as id,
                proposalCode as code,
                proposalNumber as proposal,
                visit_number as visit,
                beamLineName as beamline
            FROM
                BLSession
                JOIN Proposal USING (proposalId)
            "
        )
        .fetch_all(ispyb_pool)
        .await?
        .into_iter()
        .filter_map(|row| Self::try_from(row).ok())
        .collect())
    }
}

#[allow(clippy::missing_docs_in_private_items)]
struct SessionRow {
    id: u32,
    code: Option<String>,
    proposal: Option<String>,
    visit: Option<u32>,
    beamline: Option<String>,
}

impl TryFrom<SessionRow> for Session {
    type Error = anyhow::Error;

    fn try_from(value: SessionRow) -> Result<Self, Self::Error> {
        let code = match value.code {
            Some(code) if code.is_empty() => Err(anyhow::anyhow!("Proposal code was empty")),
            Some(code)
                if code
                    .chars()
                    .next()
                    .is_some_and(|char| !char.is_alphanumeric()) =>
            {
                Err(anyhow::anyhow!("Proposal code began with non-alphanumeric"))
            }
            Some(code) => Ok(code),
            None => Err(anyhow::anyhow!("Proposal code was NULL")),
        }?;

        let visit = match value.visit {
            Some(0) => Err(anyhow::anyhow!("Visit number was zero")),
            Some(visit) => Ok(visit),
            None => Err(anyhow::anyhow!("Visit number was NULL")),
        }?;

        Ok(Self {
            id: value.id,
            proposal_code: code,
            proposal_number: value
                .proposal
                .ok_or(anyhow::anyhow!("Proposal number was NULL"))?
                .parse()?,
            visit,
            beamline: value.beamline.ok_or(anyhow::anyhow!("Beamline was NULL"))?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::Session;
    use sqlx::MySqlPool;
    use std::collections::BTreeSet;

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let sessions = Session::fetch(&ispyb_pool).await.unwrap();
        let expected: Vec<Session> = Vec::new();
        assert_eq!(expected, sessions);
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(path = "../../tests/fixtures", scripts("bl_sessions", "proposals"))
    )]
    async fn fetch_some(ispyb_pool: MySqlPool) {
        let sessions = Session::fetch(&ispyb_pool)
            .await
            .unwrap()
            .into_iter()
            .collect();
        let expected = BTreeSet::from([
            Session {
                id: 43,
                proposal_code: "cm".to_string(),
                proposal_number: 10031,
                visit: 4,
                beamline: "i22".to_string(),
            },
            Session {
                id: 44,
                proposal_code: "cm".to_string(),
                proposal_number: 10031,
                visit: 5,
                beamline: "p45".to_string(),
            },
            Session {
                id: 40,
                proposal_code: "sw".to_string(),
                proposal_number: 10030,
                visit: 1,
                beamline: "i03".to_string(),
            },
            Session {
                id: 41,
                proposal_code: "sw".to_string(),
                proposal_number: 10030,
                visit: 2,
                beamline: "i04-1".to_string(),
            },
        ]);
        assert_eq!(expected, sessions);
    }
}
