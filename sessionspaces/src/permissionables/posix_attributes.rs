use ldap3::{Ldap, LdapError, Scope, SearchEntry};
use std::collections::BTreeMap;

#[derive(Clone)]
pub struct PosixAttributes {
    pub session_name: String,
    pub gid: String,
}

impl PosixAttributes {
    pub async fn fetch_gid(
        ldap: &mut Ldap,
    ) -> Result<BTreeMap<String, PosixAttributes>, LdapError> {
        let (rs, _res) = ldap
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
                    let session_name_str = session_name.concat().replace("_", "-");

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
    