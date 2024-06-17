use derive_more::{Deref, DerefMut};
use sqlx::{query_as, MySqlPool};
use std::collections::{BTreeMap, BTreeSet};
use tracing::instrument;

/// A mapping of sessions to the subjects on them
#[derive(Debug, Default, Deref, DerefMut, PartialEq, Eq, PartialOrd, Ord)]
pub struct SessionSubjects(BTreeMap<u32, BTreeSet<String>>);

#[allow(clippy::missing_docs_in_private_items)]
struct SubjectRow {
    subject: Option<String>,
    session: u32,
}

impl SessionSubjects {
    /// Fetches [`SessionSubjects`]s from ISPyB
    #[instrument(name = "fetch_subject_sessions")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Self, anyhow::Error> {
        let mut session_subjects = Self::default();
        for SubjectRow { session, subject } in query_as!(
            SubjectRow,
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
                session_subjects
                    .entry(session)
                    .or_insert(BTreeSet::default())
                    .insert(subject);
            }
        }
        Ok(session_subjects)
    }
}

#[cfg(test)]
mod tests {
    use super::SessionSubjects;
    use sqlx::MySqlPool;
    use std::collections::{BTreeMap, BTreeSet};

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let subject_sessions = SessionSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = SessionSubjects::default();
        assert_eq!(expected, subject_sessions);
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(
            path = "../../tests/fixtures",
            scripts("persons", "session_has_person")
        )
    )]
    async fn fetch_some(ispyb_pool: MySqlPool) {
        let subject_sessions = SessionSubjects::fetch(&ispyb_pool).await.unwrap();
        let expected = SessionSubjects(BTreeMap::from([
            (40, BTreeSet::from(["foo".to_string()])),
            (41, BTreeSet::from(["foo".to_string()])),
            (42, BTreeSet::from(["foo".to_string()])),
            (43, BTreeSet::from(["bar".to_string()])),
            (44, BTreeSet::from(["bar".to_string()])),
        ]));
        assert_eq!(expected, subject_sessions);
    }
}
