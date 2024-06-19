use sqlx::{query_as, MySqlPool};
use time::PrimitiveDateTime;
use tracing::instrument;

/// A singular beamline session
#[derive(Debug, Eq, PartialEq, PartialOrd, Ord, Clone)]
pub struct BasicInfo {
    /// The opaque identifier of the session
    pub id: u32,
    /// The opaque identifier of the proposal with which this session is associated
    pub proposal_id: u32,
    /// The type code of the proposal with which this session is associated
    pub proposal_code: String,
    /// The proposal number with which this session is associated
    pub proposal_number: u32,
    /// The visit number within the proposal
    pub visit: u32,
    /// The beamline with which the session is associated
    pub beamline: String,
    /// The session start date and time
    pub start_date: PrimitiveDateTime,
    /// The session end date and time
    pub end_date: PrimitiveDateTime,
}

impl BasicInfo {
    /// Fetches [`Session`]s from ISPyB
    #[instrument(name = "fetch_sessions")]
    pub async fn fetch(ispyb_pool: &MySqlPool) -> Result<Vec<Self>, sqlx::Error> {
        Ok(query_as!(
            BasicInfoRow,
            "
            SELECT
                sessionId as id,
                proposalId as proposal_id,
                proposalCode as proposal_code,
                proposalNumber as proposal_number,
                visit_number as visit,
                beamLineName as beamline,
                startDate as start_date,
                endDate as end_date
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
struct BasicInfoRow {
    id: u32,
    proposal_id: u32,
    proposal_code: Option<String>,
    proposal_number: Option<String>,
    visit: Option<u32>,
    beamline: Option<String>,
    start_date: Option<PrimitiveDateTime>,
    end_date: Option<PrimitiveDateTime>,
}

impl TryFrom<BasicInfoRow> for BasicInfo {
    type Error = anyhow::Error;

    fn try_from(value: BasicInfoRow) -> Result<Self, Self::Error> {
        let code = match value.proposal_code {
            Some(proposal_code) if proposal_code.is_empty() => {
                Err(anyhow::anyhow!("Proposal code was empty"))
            }
            Some(proposal_code)
                if proposal_code
                    .chars()
                    .next()
                    .is_some_and(|char| !char.is_alphanumeric()) =>
            {
                Err(anyhow::anyhow!("Proposal code began with non-alphanumeric"))
            }
            Some(code) => Ok(code),
            None => Err(anyhow::anyhow!("Proposal code was NULL")),
        }?;

        let visit = match value.visit {
            Some(0) => Err(anyhow::anyhow!("Visit number was zero")),
            Some(visit) => Ok(visit),
            None => Err(anyhow::anyhow!("Visit number was NULL")),
        }?;

        Ok(Self {
            id: value.id,
            proposal_id: value.proposal_id,
            proposal_code: code,
            proposal_number: value
                .proposal_number
                .ok_or(anyhow::anyhow!("Proposal number was NULL"))?
                .parse()?,
            visit,
            beamline: value.beamline.ok_or(anyhow::anyhow!("Beamline was NULL"))?,
            start_date: value
                .start_date
                .ok_or(anyhow::anyhow!("startDate was NULL"))?,
            end_date: value.end_date.ok_or(anyhow::anyhow!("endDate was NULL"))?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::BasicInfo;
    use sqlx::MySqlPool;
    use std::collections::BTreeSet;
    use time::{
        macros::{date, time},
        PrimitiveDateTime,
    };

    #[sqlx::test(migrations = "tests/migrations")]
    async fn fetch_empty(ispyb_pool: MySqlPool) {
        let sessions = BasicInfo::fetch(&ispyb_pool).await.unwrap();
        let expected: Vec<BasicInfo> = Vec::new();
        assert_eq!(expected, sessions);
    }

    #[sqlx::test(
        migrations = "tests/migrations",
        fixtures(path = "../../tests/fixtures", scripts("bl_sessions", "proposals"))
    )]
    async fn fetch_some(ispyb_pool: MySqlPool) {
        let sessions = BasicInfo::fetch(&ispyb_pool)
            .await
            .unwrap()
            .into_iter()
            .collect();
        let expected = BTreeSet::from([
            BasicInfo {
                id: 43,
                proposal_id: 31,
                proposal_code: "cm".to_string(),
                proposal_number: 10031,
                visit: 4,
                beamline: "i22".to_string(),
                start_date: PrimitiveDateTime::new(date!(2011 - 01 - 19), time!(00:00:00)),
                end_date: PrimitiveDateTime::new(date!(2011 - 01 - 19), time!(00:00:00)),
            },
            BasicInfo {
                id: 44,
                proposal_id: 31,
                proposal_code: "cm".to_string(),
                proposal_number: 10031,
                visit: 5,
                beamline: "p45".to_string(),
                start_date: PrimitiveDateTime::new(date!(2011 - 01 - 19), time!(00:00:00)),
                end_date: PrimitiveDateTime::new(date!(2011 - 01 - 19), time!(00:00:00)),
            },
            BasicInfo {
                id: 40,
                proposal_id: 30,
                proposal_code: "sw".to_string(),
                proposal_number: 10030,
                visit: 1,
                beamline: "i03".to_string(),
                start_date: PrimitiveDateTime::new(date!(2009 - 06 - 19), time!(09:00:00)),
                end_date: PrimitiveDateTime::new(date!(2009 - 07 - 19), time!(09:00:00)),
            },
            BasicInfo {
                id: 41,
                proposal_id: 30,
                proposal_code: "sw".to_string(),
                proposal_number: 10030,
                visit: 2,
                beamline: "i04-1".to_string(),
                start_date: PrimitiveDateTime::new(date!(2010 - 06 - 19), time!(00:00:00)),
                end_date: PrimitiveDateTime::new(date!(2010 - 06 - 19), time!(00:00:00)),
            },
        ]);
        assert_eq!(expected, sessions);
    }
}
