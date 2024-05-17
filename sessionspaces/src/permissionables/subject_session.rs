use sqlx::{query_as, MySqlPool};
use tracing::instrument;

/// The association of a subject with a session
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
