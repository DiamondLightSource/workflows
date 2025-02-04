use derive_more::{Deref, DerefMut};
use if_chain::if_chain;
use ldap3::{Ldap, LdapError, Scope, SearchEntry};
use std::collections::BTreeMap;

/// A mapping of sessions to their posix attributes
#[derive(Debug, Default, Deref, DerefMut)]
pub struct SessionPosixAttributes(BTreeMap<String, PosixAttributes>);

/// The posix attributes of a beamline session group
#[derive(Debug)]
pub struct PosixAttributes {
    /// The posix Group ID of the session group
    pub gid: u32,
}

impl SessionPosixAttributes {
    /// Fetches [`PosixAttributes`] from the SciComp LDAP
    pub async fn fetch(ldap_connection: &mut Ldap) -> Result<Self, LdapError> {
        let (rs, _res) = ldap_connection
            .search(
                "ou=Group,dc=diamond,dc=ac,dc=uk",
                Scope::Subtree,
                "(&(objectclass=posixgroup))",
                vec!["gidnumber", "cn"],
            )
            .await?
            .success()?;

        let mut posix_attributes = Self::default();
        for result_entry in rs {
            let mut search_entry = SearchEntry::construct(result_entry);
            if_chain! {
                if let Some(gids) = search_entry.attrs.remove("gidNumber");
                if let Ok([gid]) = <[_;1]>::try_from(gids);
                if let Ok(gid) = gid.parse();
                then {
                    if let Some(Ok([session_name])) = search_entry.attrs.remove("cn").map(<[_;1]>::try_from) {
                        posix_attributes
                            .insert(session_name.replace('_', "-"), PosixAttributes { gid });
                    }
                }
            }
        }
        Ok(posix_attributes)
    }
}
