use crate::TriggerCreateArgs;
use auth_core::oidc;
use gql_client::Client;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fmt::Display,
    fs::{self, DirEntry, File},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

const GRAPH_URL: &str = "https://staging.workflows.diamond.ac.uk/graphql";
const KEYCLOAK_URL: &str = "https://identity.test.diamond.ac.uk";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Trigger {
    name: String,
    template_ref: Option<String>,
    beamline: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTriggerResponse {
    create_trigger: Trigger,
}

pub async fn create_trigger(args: TriggerCreateArgs) {
    let mutation = r#"
        mutation createTrigger($templateRef: String!, $visit: VisitInput, $name: String) {
            createTrigger(templateRef: $templateRef, visit: $visit, name: $name) {
                name
                beamline
                templateRef
            }
        }
    "#;
    let token = get_auth_token();
    let mut headers = HashMap::new();
    headers.insert("Authorization", format!("Bearer {}", token));
    let client = Client::new_with_headers(GRAPH_URL, headers);
    let resp = client
        .query_with_vars_unwrap::<CreateTriggerResponse, TriggerCreateArgs>(mutation, args)
        .await
        .expect("Mutation failed");
    println!("Created trigger {}", resp.create_trigger.name);
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

async fn get_refreshed_token(refresh_token: String) {
    let token_url = KEYCLOAK_URL.to_string() + "/realms/dls/protocol/openid-connect/token";
    let res = reqwest::Client::new()
        .get(token_url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("client_id=workflows-cli")
        .body("grant_type=refresh_token")
        .body(format!("refresh_token={refresh_token}"))
        .send()
        .await
        .expect("Failed to refresh token");
    println!("{:?}", res)
}
