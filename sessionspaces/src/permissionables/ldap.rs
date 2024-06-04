use ldap3::{LdapConnAsync, Scope, SearchEntry};

pub async fn ldap_search(namespace: String) -> Option<String> {
    let (conn, mut ldap) = LdapConnAsync::new("ldap://ldap.diamond.ac.uk")
        .await
        .unwrap();
    ldap3::drive!(conn);
    let common_name = namespace.replace("-", "_");
    let filter = format!("(&(objectClass=posixgroup)(cn={common_name}))",);
    let (rs, _res) = ldap
        .search(
            "ou=Group,dc=diamond,dc=ac,dc=uk",
            Scope::Subtree,
            &filter,
            vec!["gidnumber"],
        )
        .await
        .unwrap()
        .success()
        .unwrap();
    for entry in rs {
        if let Some(res) = SearchEntry::construct(entry).attrs.get("gidNumber") {
            return Some(res.concat());
        }
    }
    None
}
