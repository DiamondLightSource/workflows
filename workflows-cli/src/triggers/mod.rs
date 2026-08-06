use super::run_query;
use crate::visit::VisitInput;
use clap::Parser;
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Parser, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerCreateArgs {
    #[arg(long)]
    name: Option<String>,
    #[arg(long)]
    visit: Option<VisitInput>,
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

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Trigger {
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
    let res =
        run_query::<TriggerCreateArgs, CreateTriggerResponse>(CREATE_TRIGGER_MUTATION, args).await;
    println!("Created trigger {}", res.create_trigger.name);
}
