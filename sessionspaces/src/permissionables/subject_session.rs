use sqlx::{query_as, MySqlPool};
use tracing::instrument;

/// The association of a subject with a session
#[derive(Debug, PartialEq)]
pub struct SubjectSession {
    /// The subject associated with the session
    pub subject: String,
    /// The session which the subject is on
    pub session: u32,
}

#[allow(clippy::missing_docs_in_private_items)]
struct SubjectSessionRow {
    subject: Option<String>,
    session: u32,
}

impl TryFrom<SubjectSessionRow> for SubjectSession {
    type Error = anyhow::Error;

    fn try_from(value: SubjectSessionRow) -> Result<Self, Self::Error> {
        Ok(Self {
            subject: value.subject.ok_or(anyhow::anyhow!("Subject was NULL"))?,
            session: value.session,
        })
    }
}

impl SubjectSession {
    /// Fetches [`SubjectSession`]s from ISPyB
    #[instrument(name = "fetch_subject_sessions")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Vec<Self>, anyhow::Error> {
        Ok(query_as!(
            SubjectSessionRow,
            "
            SELECT
                login as subject,
                sessionId as session
            FROM
                Person
                INNER JOIN Session_has_Person USING (personId)
            "
        )
        .fetch_all(ispyb_pool)
        .await?
        .into_iter()
        .filter_map(|row| Self::try_from(row).ok())
        .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::SubjectSession;
    use sqlx::MySqlPool;

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let subject_sessions = SubjectSession::fetch(&ispyb_pool).await.unwrap();
        let expected: Vec<SubjectSession> = Vec::new();
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
        let subject_sessions = SubjectSession::fetch(&ispyb_pool).await.unwrap();
        let expected = vec![
            SubjectSession {
                subject: "bar".to_string(),
                session: 43,
            },
            SubjectSession {
                subject: "bar".to_string(),
                session: 44,
            },
            SubjectSession {
                subject: "foo".to_string(),
                session: 40,
            },
            SubjectSession {
                subject: "foo".to_string(),
                session: 41,
            },
            SubjectSession {
                subject: "foo".to_string(),
                session: 42,
            },
        ];
        assert_eq!(expected, subject_sessions);
    }
}
