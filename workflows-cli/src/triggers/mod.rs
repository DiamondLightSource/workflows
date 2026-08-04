use crate::TriggerCreateArgs;
use gql_client::Client;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::{self, DirEntry, File},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

const GRAPH_URL: &str = "https://workflows.diamond.ac.uk/graphql";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Trigger {
    name: Option<String>,
    template_ref: Option<String>,
    beamline: Option<String>,
}

pub async fn create_trigger(args: TriggerCreateArgs) {
    let mutation = r#"
        mutation createTrigger($templateRef: String!, $visit: VisitInput, $name: String) {
            createTrigger(templateRef: $templateRef, visit: $visit, name: $name) {
                name
            }
        }
    "#;
    let token = get_auth_token();
    let mut headers = HashMap::new();
    headers.insert("Authorization", format!("Bearer {}", token));
    println!("{}", GRAPH_URL);
    let client = Client::new_with_headers(GRAPH_URL, headers);
    let resp = client
        .query_with_vars_unwrap::<Trigger, TriggerCreateArgs>(mutation, args)
        .await
        .expect("Mutation failed");
    println!("Created trigger {:?}", resp.name);
}

#[derive(Deserialize)]
struct CachedTokens {
    id_token: String,
}

fn get_auth_token() -> String {
    let cache_path = Path::new("/root/.kube/cache/workflows/oidc-login"); // CHANGE TO /home/user
    let dir_contents = fs::read_dir(cache_path).expect("Unable to access cached tokens directory");
    let mut newest_file: Option<DirEntry> = None;
    let mut timestamp: SystemTime = UNIX_EPOCH;
    for file in dir_contents.flatten() {
        let file_metadata = file.metadata().unwrap();

        let file_timestamp = file_metadata.modified().unwrap();

        if file_timestamp > timestamp {
            newest_file = Some(file);
            timestamp = file_timestamp;
        }
    }

    let file = fs::File::open(newest_file.expect("No cached token files found").path()).expect(r#"
        Authentication error. Please run 'kubectl get workflows -n {}' to prompt a login and try again.
    "#);
    let tokens = serde_json::from_reader::<File, CachedTokens>(file)
        .expect("Error: cached tokens are formatted incorrectly");
    tokens.id_token
}
