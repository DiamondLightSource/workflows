use derive_more::{Deref, DerefMut};
use sqlx::{query_as, MySqlPool};
use std::collections::{BTreeMap, BTreeSet};
use tracing::instrument;

/// A mapping of proposals to the subjects on them
#[derive(Debug, Default, Deref, DerefMut, PartialEq, Eq)]
pub struct ProposalSubjects(BTreeMap<u32, BTreeSet<String>>);

#[allow(dead_code, clippy::missing_docs_in_private_items)]
struct ProposalSubjectRow {
    subject: Option<String>,
    proposal_id: u32,
}

impl ProposalSubjects {
    #[instrument(name = "fetch_proposal_subjects")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Self, sqlx::Error> {
        let mut proposal_subjects = Self::default();
        for ProposalSubjectRow {
            subject,
            proposal_id,
        } in query_as!(
            ProposalSubjectRow,
            "
            SELECT
                proposalId as proposal_id,
                login as subject
            FROM
                Person
                INNER JOIN ProposalHasPerson USING (personId)
            "
        )
        .fetch_all(ispyb_pool)
        .await?
        {
            if let Some(subject) = subject {
                proposal_subjects
                    .entry(proposal_id)
                    .or_insert(BTreeSet::default())
                    .insert(subject);
            }
        }
        Ok(proposal_subjects)
    }
}

#[cfg(test)]
mod tests {
    use super::ProposalSubjects;
    use sqlx::MySqlPool;
    use std::collections::{BTreeMap, BTreeSet};

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let direct_subjects = ProposalSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = ProposalSubjects::default();
        assert_eq!(expected, direct_subjects);
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            "../../tests/fixtures/persons.sql",
            "../../tests/fixtures/proposal_has_person.sql"
        )
    )]
    async fn fetch_some(ispyb_pool: MySqlPool) {
        let direct_subjects = ProposalSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = ProposalSubjects(BTreeMap::from([
            (30, BTreeSet::from(["foo".to_string()])),
            (31, BTreeSet::from(["foo".to_string(), "bar".to_string()])),
        ]));
        assert_eq!(expected, direct_subjects);
    }
}
