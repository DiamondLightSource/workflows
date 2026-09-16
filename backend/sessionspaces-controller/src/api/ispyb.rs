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

#[cfg(test)]
mod tests {
    use super::super::types::SessionName;
    use super::{BasicInfo, DirectSubject, ProposalSubject};
    use sqlx::MySqlPool;
    use std::collections::BTreeSet;
    use time::{
        PrimitiveDateTime,
        macros::{date, time},
    };

    #[sqlx::test(migrations = "tests/migrations")]
    async fn basic_info_missing_visit(pool: MySqlPool) {
        let name = SessionName::parse("mx99999-1").unwrap();
        assert!(BasicInfo::fetch(&pool, &name).await.unwrap().is_none());
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            "../../tests/fixtures/bl_sessions.sql",
            "../../tests/fixtures/proposals.sql"
        )
    )]
    async fn basic_info_known_visit(pool: MySqlPool) {
        let name = SessionName::parse("sw10030-1").unwrap();
        let info = BasicInfo::fetch(&pool, &name).await.unwrap().unwrap();
        assert_eq!((info.session_id, info.proposal_id), (40, 30));
        assert_eq!(info.instrument.as_deref(), Some("i03"));
        assert_eq!(
            info.start_date,
            Some(PrimitiveDateTime::new(
                date!(2009 - 06 - 19),
                time!(09:00:00)
            ))
        );
        assert_eq!(
            info.end_date,
            Some(PrimitiveDateTime::new(
                date!(2009 - 07 - 19),
                time!(09:00:00)
            ))
        );
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            "../../tests/fixtures/persons.sql",
            "../../tests/fixtures/session_has_person.sql"
        )
    )]
    async fn direct_subjects(pool: MySqlPool) {
        assert_eq!(
            DirectSubject::fetch(&pool, 40).await.unwrap(),
            BTreeSet::from(["foo".to_string()])
        );
        assert_eq!(
            DirectSubject::fetch(&pool, 43).await.unwrap(),
            BTreeSet::from(["bar".to_string()])
        );
        assert!(DirectSubject::fetch(&pool, 999).await.unwrap().is_empty());
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            "../../tests/fixtures/persons.sql",
            "../../tests/fixtures/proposal_has_person.sql"
        )
    )]
    async fn proposal_subjects(pool: MySqlPool) {
        assert_eq!(
            ProposalSubject::fetch(&pool, 30).await.unwrap(),
            BTreeSet::from(["foo".to_string()])
        );
        assert_eq!(
            ProposalSubject::fetch(&pool, 31).await.unwrap(),
            BTreeSet::from(["bar".to_string(), "foo".to_string()])
        );
        assert!(ProposalSubject::fetch(&pool, 999).await.unwrap().is_empty());
    }
}
