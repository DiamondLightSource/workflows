use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::{fmt::Display, str::FromStr};

/// A visit to an instrument as part of a session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisitInput {
    /// Project Proposal Code
    pub proposal_code: String,
    /// Project Proposal Number
    pub proposal_number: u32,
    /// Session visit Number
    pub number: u32,
}

impl Display for VisitInput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}{}-{}",
            self.proposal_code, self.proposal_number, self.number
        )
    }
}

lazy_static! {
    static ref VISIT_REGEX: regex::Regex =
        regex::Regex::new(r"^([A-Za-z]+)(\d+)-(\d+)$").expect("invalid RegEx");
}

impl FromStr for VisitInput {
    type Err = anyhow::Error;

    fn from_str(string: &str) -> Result<Self, Self::Err> {
        let caps = VISIT_REGEX
            .captures(string)
            .ok_or_else(|| anyhow::anyhow!("Invalid visit format"))?;
        Ok(VisitInput {
            proposal_code: caps[1].to_string(),
            proposal_number: caps[2]
                .parse()
                .map_err(|err| anyhow::anyhow!("Invalid proposal number: {err}"))?,
            number: caps[3]
                .parse()
                .map_err(|err| anyhow::anyhow!("Invalid visit number: {err}"))?,
        })
    }
}
