use super::Session;
use crate::{instruments::Instrument, permissionables::Sessions};
use serde::Deserialize;
use std::{collections::BTreeSet, path::Path, str::FromStr};
use time::{macros::format_description, PrimitiveDateTime};

/// Deserialises an [`Instrument`] from its string representation (e.g. `"i03"`).
fn deserialize_instrument<'de, D>(deserializer: D) -> Result<Instrument, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    Instrument::from_str(&s).map_err(serde::de::Error::custom)
}

/// Deserialises a [`PrimitiveDateTime`] from `"YYYY-MM-DD HH:MM:SS"` format.
fn deserialize_datetime<'de, D>(deserializer: D) -> Result<PrimitiveDateTime, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    let format = format_description!("[year]-[month]-[day] [hour]:[minute]:[second]");
    PrimitiveDateTime::parse(&s, format).map_err(serde::de::Error::custom)
}

/// A single statically-defined visit session, deserialised from the config file.
/// Field names and semantics are identical to those of [`Session`], except `visits` accepts
/// multiple visit numbers so one entry can produce several namespaces sharing the same members.
#[derive(Debug, Deserialize)]
struct StaticSessionEntry {
    /// The two-letter prefix code associated with the proposal (e.g. `"ks"`).
    proposal_code: String,
    /// The unique number of the proposal.
    proposal_number: u32,
    /// One or more visit numbers. Each produces a separate namespace (`{code}{number}-{visit}`).
    visits: Vec<u32>,
    /// The instrument with which the session is associated.
    #[serde(deserialize_with = "deserialize_instrument")]
    instrument: Instrument,
    /// Set of usernames granted access. Defaults to empty if omitted.
    #[serde(default)]
    members: BTreeSet<String>,
    /// Posix GID of the session group. `null` if no LDAP group exists for this session.
    gid: Option<u32>,
    /// Session start date and time.
    #[serde(deserialize_with = "deserialize_datetime")]
    start_date: PrimitiveDateTime,
    /// Session end date and time.
    #[serde(deserialize_with = "deserialize_datetime")]
    end_date: PrimitiveDateTime,
}

impl StaticSessionEntry {
    /// Expands this entry into one [`Session`] per visit number.
    fn into_sessions(self) -> impl Iterator<Item = (String, Session)> {
        self.visits.into_iter().map(move |visit| {
            let name = format!("{}{}-{}", self.proposal_code, self.proposal_number, visit);
            let session = Session {
                proposal_code: self.proposal_code.clone(),
                proposal_number: self.proposal_number,
                visit,
                instrument: self.instrument,
                members: self.members.clone(),
                gid: self.gid,
                start_date: self.start_date,
                end_date: self.end_date,
            };
            (name, session)
        })
    }
}

/// A set of statically-configured sessions that emulate ISPyB-driven visit namespaces.
/// Loaded once at startup from a JSON file (an array of session objects). On each reconcile
/// tick these sessions are merged into the live [`Sessions`] map so they pass through the
/// exact same create / update / delete lifecycle as real visits.
#[derive(Debug, Default, Clone)]
pub struct StaticSessions(Sessions);

impl StaticSessions {
    /// Instantiates a `StaticSessions` by reading and deserialising the given JSON file. The file
    pub fn from_path(path: &Path) -> Result<Self, anyhow::Error> {
        let content = std::fs::read_to_string(path)?;
        let entries: Vec<StaticSessionEntry> = serde_json::from_str(&content)?;
        let mut sessions = Sessions::default();
        for entry in entries {
            for (name, session) in entry.into_sessions() {
                sessions.insert(name, session);
            }
        }
        Ok(Self(sessions))
    }

    /// Inserts each static session into `target`, using the same namespace naming scheme as
    /// ISPyB sessions (`{proposal_code}{proposal_number}-{visit}`). Real ISPyB sessions with
    /// the same name take precedence; static entries are skipped if the name already exists.
    pub fn merge_into(&self, target: &mut Sessions) {
        for (name, session) in self.0.iter() {
            target
                .entry(name.clone())
                .or_insert_with(|| session.clone());
        }
    }
}
