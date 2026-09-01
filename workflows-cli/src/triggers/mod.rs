use super::submit_graph_query;
use crate::GRAPH_URL;
use crate::visit::VisitInput;
use clap::Parser;
use serde::Deserialize;
use serde::Serialize;

/// Arguments for the trigger creation command
#[derive(Debug, Parser, Serialize, Deserialize)]
pub struct TriggerCreateArgs {
    /// The name that will be given to the created trigger
    #[arg(long, short)]
    name: Option<String>,
    /// The session that this trigger will be associated with
    #[arg(long, short, visible_alias = "visit", visible_short_alias = 'v')]
    #[serde(rename(serialize = "visit"))]
    session: Option<VisitInput>,
    /// The trigger template that will be used to generate the trigger
    #[serde(rename = "templateRef")]
    template_ref: String,
}

const CREATE_TRIGGER_MUTATION: &str = r#"
    mutation createTrigger($templateRef: String!, $visit: VisitInput, $name: String) {
        createTrigger(templateRef: $templateRef, visit: $visit, name: $name) {
            name
            beamline
            templateRef
        }
    }
"#;

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Trigger {
    name: String,
    template_ref: Option<String>,
    beamline: Option<String>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
struct CreateTriggerResponse {
    create_trigger: Trigger,
}

/// Submit a mutation to create a workflow trigger
pub async fn create_trigger(args: TriggerCreateArgs) {
    submit_graph_query::<TriggerCreateArgs, CreateTriggerResponse>(
        GRAPH_URL,
        CREATE_TRIGGER_MUTATION,
        args,
    )
    .await
    .map_or_else(
        |e| println!("{}", e),
        |res| println!("Created trigger {}", res.create_trigger.name),
    );
}

#[cfg(test)]
mod tests {

    use std::path::PathBuf;

    use crate::{
        submit_graph_query,
        triggers::{CREATE_TRIGGER_MUTATION, CreateTriggerResponse, Trigger, TriggerCreateArgs},
    };

    #[tokio::test]
    async fn trigger_create() {
        let mut response_file_path = PathBuf::new();
        response_file_path.push("tests");
        response_file_path.push("mock_responses");
        response_file_path.push("trigger_success.json");
        let mut server = mockito::Server::new_async().await;
        server
            .mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body_from_file(response_file_path)
            .create_async()
            .await;

        let args = TriggerCreateArgs {
            name: None,
            session: None,
            template_ref: "example-trigger".to_string(),
        };
        let res: Result<CreateTriggerResponse, crate::QueryError> =
            submit_graph_query::<TriggerCreateArgs, CreateTriggerResponse>(
                &server.url(),
                CREATE_TRIGGER_MUTATION,
                args,
            )
            .await;
        let exp_trigger = Trigger {
            name: "example-trigger-k44zb".to_string(),
            beamline: None,
            template_ref: None,
        };
        let exp_resp = CreateTriggerResponse {
            create_trigger: exp_trigger,
        };
        assert_eq!(res.unwrap(), exp_resp);
    }
}
