/// Basic Beamline Sessions attributes
mod basic_info;
/// Associations between sessions and subjects
mod direct_subjects;
/// Associations between instruments and subjects
mod instrument_subjects;
/// Beamline Session posix Group ID
mod posix_attributes;
/// Associations between proposals and subjects
mod proposal_subjects;

use self::{basic_info::BasicInfo, direct_subjects::DirectSubjects};
use crate::instruments::Instrument;
use instrument_subjects::InstrumentSubjects;
use ldap3::Ldap;
use posix_attributes::SessionPosixAttributes;
use proposal_subjects::ProposalSubjects;
use sqlx::MySqlPool;
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt::Display,
};
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
    /// The instrument with which the session is associated
    pub instrument: Instrument,
    /// A set of session members
    pub members: BTreeSet<String>,
    /// The posix GID of the session group
    pub gid: Option<String>,
    /// The session start date and time
    pub start_date: PrimitiveDateTime,
    /// The session end date and time
    pub end_date: PrimitiveDateTime,
}

impl Display for Session {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{{ session: {}{}-{}, instrument: {}, members: {}, gid: {}, start: {}, end: {} }}",
            self.proposal_code,
            self.proposal_number,
            self.visit,
            self.instrument,
            self.members.len(),
            match &self.gid {
                Some(gid) => gid.to_string(),
                None => "None".to_string(),
            },
            self.start_date,
            self.end_date
        )
    }
}

/// A mapping of session namespaces to their session info
#[derive(Debug, Default, derive_more::Deref, derive_more::DerefMut, Clone)]
pub struct Sessions(BTreeMap<String, Session>);

impl Sessions {
    /// Creates [`Sessions`] from Session [`BasicInfo`], [`SubjectSession`], and [`PosixAttributes`]
    fn new(
        basic_info: Vec<BasicInfo>,
        mut direct_subjects: DirectSubjects,
        proposal_subjects: ProposalSubjects,
        instrument_subjects: InstrumentSubjects,
        mut posix_attributes: SessionPosixAttributes,
    ) -> Self {
        let mut sessions = Self::default();
        for session in basic_info.into_iter() {
            let session_name = format!(
                "{}{}-{}",
                session.proposal_code, session.proposal_number, session.visit
            );
            let members = [
                direct_subjects.remove(&session.id).unwrap_or_default(),
                proposal_subjects
                    .get(&session.proposal_id)
                    .cloned()
                    .unwrap_or_default(),
                instrument_subjects
                    .get(&session.instrument)
                    .cloned()
                    .unwrap_or_default(),
            ]
            .into_iter()
            .flatten()
            .collect();
            sessions.insert(
                session_name.clone(),
                Session {
                    proposal_code: session.proposal_code,
                    proposal_number: session.proposal_number,
                    visit: session.visit,
                    instrument: session.instrument,
                    members,
                    gid: posix_attributes
                        .remove(&session_name)
                        .map(|attributes| attributes.gid),
                    start_date: session.start_date,
                    end_date: session.end_date,
                },
            );
        }
        sessions
    }

    /// Fetches the neccasary information to create Sessions from ISPyB and the SciComp LDAP
    #[instrument(skip_all)]
    pub async fn fetch(
        ispyb_pool: &MySqlPool,
        ldap_connection: &mut Ldap,
    ) -> Result<Self, anyhow::Error> {
        let basic_info = BasicInfo::fetch(ispyb_pool).await?;
        let direct_subjects = DirectSubjects::fetch(ispyb_pool).await?;
        let proposal_subjects = ProposalSubjects::fetch(ispyb_pool).await?;
        let instrument_subjects = InstrumentSubjects::fetch(ldap_connection).await?;
        let posix_attributes = SessionPosixAttributes::fetch(ldap_connection).await?;
        Ok(Self::new(
            basic_info,
            direct_subjects,
            proposal_subjects,
            instrument_subjects,
            posix_attributes,
        ))
    }
}
