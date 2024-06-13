use ldap3::{Ldap, LdapError, Scope, SearchEntry};
use std::collections::BTreeMap;

/// The posix attributes of a beamline session group
#[derive(Debug, Clone)]
pub struct PosixAttributes {
    /// The unique identifier of the session
    pub session_name: String,
    /// The posix Group ID of the session group
    pub gid: String,
}

impl PosixAttributes {
    /// Fetches [`PosixAttributes`] from the SciComp LDAP
    pub async fn fetch(
        ldap_connection: &mut Ldap,
    ) -> Result<BTreeMap<String, PosixAttributes>, LdapError> {
        let (rs, _res) = ldap_connection
            .search(
                "ou=Group,dc=diamond,dc=ac,dc=uk",
                Scope::Subtree,
                "(&(objectclass=posixgroup))",
                vec!["gidnumber", "cn"],
            )
            .await?
            .success()?;

        let mut posix_attr = BTreeMap::new();
        for entry in rs {
            if let Some(gid) = SearchEntry::construct(entry.clone()).attrs.get("gidNumber") {
                if let Some(session_name) = SearchEntry::construct(entry.clone()).attrs.get("cn") {
                    let session_name_str = session_name.concat().replace('_', "-");

                    posix_attr.insert(
                        session_name_str.clone(),
                        PosixAttributes {
                            session_name: session_name_str,
                            gid: gid.concat(),
                        },
                    );
                }
            }
        }
        Ok(posix_attr)
    }
}
