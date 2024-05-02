use sqlx::{query_as, MySqlPool};
use tracing::instrument;

/// A singular beamline session
pub struct Session {
    /// The opaque identifier of the session
    pub id: u32,
    /// The proposal type code
    pub code: String,
    /// The proposal number with which this session is associated
    pub proposal: u32,
    /// The visit number within the proposal
    pub visit: u32,
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
                visit_number as visit
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
}

impl TryFrom<SessionRow> for Session {
    type Error = anyhow::Error;

    fn try_from(value: SessionRow) -> Result<Self, Self::Error> {
        let code = match value.code {
            Some(code) if !code.is_empty() => Err(anyhow::anyhow!("Proposal code was empty")),
            Some(code)
                if code
                    .chars()
                    .next()
                    .is_some_and(|char| char.is_alphanumeric()) =>
            {
                Err(anyhow::anyhow!("Proposal code began with non-alphanumeric"))
            }
            Some(code) => Ok(code),
            None => Err(anyhow::anyhow!("Proposal code was NULL")),
        }?;

        Ok(Self {
            id: value.id,
            code,
            proposal: value
                .proposal
                .ok_or(anyhow::anyhow!("Proposal number was NULL"))?
                .parse()?,
            visit: value.visit.unwrap_or_default(),
        })
    }
}
