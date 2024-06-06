use crate::SessionSpaces;
use ldap3::{LdapConnAsync, Scope, SearchEntry};

pub async fn update_gid(sessions: &mut SessionSpaces) {
    let (conn, mut ldap) = LdapConnAsync::new("ldap://ldap.diamond.ac.uk")
        .await
        .unwrap();
    ldap3::drive!(conn);
    let session_names = sessions.keys().cloned().collect::<Vec<_>>();
    for session_chunk in session_names.chunks(1000) {
        let mut filter = String::from("(&(objectclass=posixgroup)(|");
        for cn in session_chunk {
            filter.push_str(&format!("(cn={})", cn.replace("-", "_")));
        }
        filter.push_str("))");
        let (rs, _res) = ldap
            .search(
                "ou=Group,dc=diamond,dc=ac,dc=uk",
                Scope::Subtree,
                &filter,
                vec!["gidnumber", "cn"],
            )
            .await
            .unwrap()
            .success()
            .unwrap();
        for entry in rs {
            if let Some(gid) = SearchEntry::construct(entry.clone()).attrs.get("gidNumber") {
                let session_name = SearchEntry::construct(entry)
                    .attrs
                    .get("cn")
                    .unwrap()
                    .concat()
                    .replace("_", "-");

                if let Some(session) = sessions.0.get_mut(&session_name) {
                    session.gid = Some(gid.concat())
                }
            }
        }
    }
}
