/// Basic Beamline Sessions attributes
mod basic_info;
/// Beamline Session posix Group ID
mod posix_attributes;
/// Associations between sessions and subjects
mod subjects;

use self::{basic_info::BasicInfo, subjects::SessionSubjects};
use ldap3::Ldap;
use posix_attributes::SessionPosixAttributes;
use sqlx::MySqlPool;
use std::collections::{BTreeMap, BTreeSet};
use time::PrimitiveDateTime;
use tracing::instrument;

/// Attributes of a Sessionspace
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Session {
    /// The two letter prefix code associated with the proposal
    pub proposal_code: String,
    /// The unique number of the proposal
    pub proposal_number: u32,
    /// The number of the visit within the proposal
    pub visit: u32,
    /// The beamline with which the session is associated
    pub beamline: String,
    /// A set of session members
    pub members: BTreeSet<String>,
    /// The posix GID of the session group
    pub gid: Option<String>,
    /// The session start date and time
    pub start_date: PrimitiveDateTime,
    /// The session end date and time
    pub end_date: PrimitiveDateTime,
}

/// A mapping of session namespaces to their session info
#[derive(Debug, Default, derive_more::Deref, derive_more::DerefMut, Clone)]
pub struct Sessions(BTreeMap<String, Session>);

impl Sessions {
    /// Creates [`Sessions`] from Session [`BasicInfo`], [`SubjectSession`], and [`PosixAttributes`]
    fn new(
        basic_info: Vec<BasicInfo>,
        mut session_subjects: SessionSubjects,
        posix_attributes: SessionPosixAttributes,
    ) -> Self {
        let mut spaces = BTreeMap::new();
        for session in basic_info.into_iter() {
            let session_name = format!(
                "{}{}-{}",
                session.proposal_code, session.proposal_number, session.visit
            );
            spaces.insert(
                session.id,
                (
                    session_name.clone(),
                    Session {
                        proposal_code: session.proposal_code,
                        proposal_number: session.proposal_number,
                        visit: session.visit,
                        beamline: session.beamline,
                        members: session_subjects.remove(&session.id).unwrap_or_default(),
                        gid: posix_attributes
                            .get(&session_name)
                            .map(|attr| attr.gid.clone()),
                        start_date: session.start_date,
                        end_date: session.end_date,
                    },
                ),
            );
        }
        Self(spaces.into_values().collect())
    }

    /// Fetches the neccasary information to create Sessions from ISPyB and the SciComp LDAP
    #[instrument(skip_all)]
    pub async fn fetch(
        ispyb_pool: &MySqlPool,
        ldap_connection: &mut Ldap,
    ) -> Result<Self, anyhow::Error> {
        let basic_info = BasicInfo::fetch(ispyb_pool).await?;
        let subject_sessions = SessionSubjects::fetch(ispyb_pool).await?;
        let posix_attributes = SessionPosixAttributes::fetch(ldap_connection).await?;
        Ok(Self::new(basic_info, subject_sessions, posix_attributes))
    }
}
