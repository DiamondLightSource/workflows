use derive_more::{Deref, DerefMut};
use sqlx::{query_as, MySqlPool};
use std::collections::{BTreeMap, BTreeSet};
use tracing::instrument;

/// A mapping of sessions to the subjects on them
#[derive(Debug, Default, Deref, DerefMut, PartialEq, Eq, PartialOrd, Ord)]
pub struct DirectSubjects(BTreeMap<u32, BTreeSet<String>>);

#[allow(clippy::missing_docs_in_private_items)]
struct DirectSubjectRow {
    subject: Option<String>,
    session: u32,
}

impl DirectSubjects {
    /// Fetches [`DirectSubjects`] from ISPyB
    #[instrument(name = "fetch_direct_subjects")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Self, sqlx::Error> {
        let mut direct_subjects = Self::default();
        for DirectSubjectRow { session, subject } in query_as!(
            DirectSubjectRow,
            "
            SELECT
                sessionId as session,
                login as subject
            FROM
                Person
                INNER JOIN Session_has_Person USING (personId)
            "
        )
        .fetch_all(ispyb_pool)
        .await?
        {
            if let Some(subject) = subject {
                direct_subjects
                    .entry(session)
                    .or_insert(BTreeSet::default())
                    .insert(subject);
            }
        }
        Ok(direct_subjects)
    }
}

#[cfg(test)]
mod tests {
    use super::DirectSubjects;
    use sqlx::MySqlPool;
    use std::collections::{BTreeMap, BTreeSet};

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let direct_subjects = DirectSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = DirectSubjects::default();
        assert_eq!(expected, direct_subjects);
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            path = "../../tests/fixtures",
            scripts("persons", "session_has_person")
        )
    )]
    async fn fetch_some(ispyb_pool: MySqlPool) {
        let direct_subjects = DirectSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = DirectSubjects(BTreeMap::from([
            (40, BTreeSet::from(["foo".to_string()])),
            (41, BTreeSet::from(["foo".to_string()])),
            (42, BTreeSet::from(["foo".to_string()])),
            (43, BTreeSet::from(["bar".to_string()])),
            (44, BTreeSet::from(["bar".to_string()])),
        ]));
        assert_eq!(expected, direct_subjects);
    }
}
