//! ISPyB visit metadata and membership queries following the existing service.

use super::types::SessionName;
use sqlx::{FromRow, MySqlPool, query_as};
use std::collections::BTreeSet;
use time::PrimitiveDateTime;

/// Visit identifiers and nullable instrument/date metadata from ISPyB.
#[derive(FromRow)]
pub(super) struct BasicInfo {
    pub session_id: u32,
    pub proposal_id: u32,
    pub instrument: Option<String>,
    pub start_date: Option<PrimitiveDateTime>,
    pub end_date: Option<PrimitiveDateTime>,
}

impl BasicInfo {
    /// Finds the proposal visit, returning `None` when no matching session exists.
    pub async fn fetch(pool: &MySqlPool, name: &SessionName) -> Result<Option<Self>, sqlx::Error> {
        query_as::<_, Self>(
            "
            SELECT
                BLSession.sessionId AS session_id,
                Proposal.proposalId AS proposal_id,
                BLSession.beamLineName AS instrument,
                BLSession.startDate AS start_date,
                BLSession.endDate AS end_date
            FROM
                BLSession
                JOIN Proposal USING (proposalId)
            WHERE
                Proposal.proposalCode = ?
                AND Proposal.proposalNumber = ?
                AND BLSession.visit_number = ?
            ",
        )
        .bind(&name.code)
        .bind(&name.number)
        .bind(name.visit)
        .fetch_optional(pool)
        .await
    }
}

/// Login row for a person directly associated with a visit.
#[derive(FromRow)]
pub(super) struct DirectSubject {
    subject: Option<String>,
}

impl DirectSubject {
    /// Returns distinct, nonempty logins associated with the given session ID.
    pub async fn fetch(pool: &MySqlPool, id: u32) -> Result<BTreeSet<String>, sqlx::Error> {
        let mut subjects = BTreeSet::new();
        for Self { subject } in query_as::<_, Self>(
            "
            SELECT
                Person.login AS subject
            FROM
                Person
                INNER JOIN Session_has_Person USING (personId)
            WHERE
                Session_has_Person.sessionId = ?
            ",
        )
        .bind(id)
        .fetch_all(pool)
        .await?
        {
            if let Some(subject) = subject.filter(|subject| !subject.is_empty()) {
                subjects.insert(subject);
            }
        }
        Ok(subjects)
    }
}

/// Login row for a person associated with a proposal.
#[derive(FromRow)]
pub(super) struct ProposalSubject {
    subject: Option<String>,
}

impl ProposalSubject {
    /// Returns distinct, nonempty logins associated with the given proposal ID.
    pub async fn fetch(pool: &MySqlPool, id: u32) -> Result<BTreeSet<String>, sqlx::Error> {
        let mut subjects = BTreeSet::new();
        for Self { subject } in query_as::<_, Self>(
            "
            SELECT
                Person.login AS subject
            FROM
                Person
                INNER JOIN ProposalHasPerson USING (personId)
            WHERE
                ProposalHasPerson.proposalId = ?
            ",
        )
        .bind(id)
        .fetch_all(pool)
        .await?
        {
            if let Some(subject) = subject.filter(|subject| !subject.is_empty()) {
                subjects.insert(subject);
            }
        }
        Ok(subjects)
    }
}
