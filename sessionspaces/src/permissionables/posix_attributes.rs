use ldap3::{Ldap, Scope, SearchEntry};
use std::collections::BTreeMap;

pub async fn fetch_gid(ldap: &mut Ldap) -> BTreeMap<String, String> {
    let (rs, _res) = ldap
        .search(
            "ou=Group,dc=diamond,dc=ac,dc=uk",
            Scope::Subtree,
            "(&(objectclass=posixgroup))",
            vec!["gidnumber", "cn"],
        )
        .await
        .unwrap()
        .success()
        .unwrap();
    let mut posix_attr = BTreeMap::new();
    for entry in rs {
        if let Some(gid) = SearchEntry::construct(entry.clone()).attrs.get("gidNumber") {
            if let Some(session_name) = SearchEntry::construct(entry.clone()).attrs.get("cn") {
                posix_attr.insert(session_name.concat().replace("_", "-"), gid.concat());
            }
        }
    }
    posix_attr
}
