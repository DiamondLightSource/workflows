use crate::TriggerCreateArgs;
use gql_client::Client;
use jsonwebtoken::dangerous::insecure_decode;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::{self, DirEntry, File},
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

const GRAPH_URL: &str = "https://staging.workflows.diamond.ac.uk/graphql";
const KEYCLOAK_URL: &str = "https://identity-test.diamond.ac.uk";

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
    let token = get_auth_token().await;
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
    refresh_token: String,
}

#[derive(Deserialize, Serialize)]
struct RefreshTokenResponse {
    access_token: String,
    id_token: String,
    refresh_token: String,
    expires_in: u32,
    refresh_expires_in: u32,
    token_type: String,
    #[serde(rename = "not-before-policy")]
    not_before_policy: u32,
    session_state: String,
    scope: String,
}

async fn get_auth_token() -> String {
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

    let expiry = insecure_decode::<Value>(&tokens.id_token)
        .expect("Unable to decode access token")
        .claims["exp"]
        .as_u64()
        .expect("expiry is not an int");

    if expiry
        >= SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Cannot read system time")
            .as_secs()
    {
        println!("Token is not expired: {:?}", expiry);
        return tokens.id_token;
    };

    get_refreshed_token(tokens.refresh_token).await
}

async fn get_refreshed_token(refresh_token: String) -> String {
    let token_url = KEYCLOAK_URL.to_string() + "/realms/dls/protocol/openid-connect/token";

    let mut params = HashMap::new();
    params.insert("client_id", "workflows-cli");
    params.insert("grant_type", "refresh_token");
    params.insert("refresh_token", refresh_token.as_str());

    let res = reqwest::Client::new()
        .post(token_url)
        .form(&params)
        .send()
        .await
        .expect("Failed to refresh token")
        .json::<RefreshTokenResponse>()
        .await
        .unwrap();

    res.access_token
}
