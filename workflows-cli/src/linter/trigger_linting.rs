use std::path::Path;

use crate::TRIGGER_TEMPLATE_CRD;
use crate::linter::base_linting::Linter;
use json_colorizer::FormatOptions;
use jsonschema::{ValidationError, error::ValidationErrorKind};
use serde_json::{Value, json};

/// Recursively iterates over the CRD schema and adds `additionalProperties: false` to all fields
/// so that jsonschema validation matches Kubernetes restrictions
fn restrict_schema(schema: &mut Value) {
    match schema {
        Value::Object(obj) => {
            if obj.contains_key("properties") && !obj.contains_key("additionalProperties") {
                obj.insert("additionalProperties".to_string(), Value::Bool(false));
            }

            for value in obj.values_mut() {
                restrict_schema(value);
            }
        }
        Value::Array(arr) => {
            for value in arr {
                restrict_schema(value);
            }
        }
        _ => {}
    }
}

/// Format the error in a user-friendly way
fn format_error(error: &ValidationError, schema: &Value) -> String {
    match error.kind() {
        ValidationErrorKind::AnyOf { context: _ } => {
            let schema_block = schema
                .pointer(&error.evaluation_path().to_string())
                .expect("anyOf schema block should be valid JSON");
            format!(
                "{}: the contents of this field must adhere to one or more of the following: {}",
                error.instance_path(),
                json_colorizer::format_json(schema_block, &FormatOptions::default())
            )
        }
        ValidationErrorKind::AdditionalProperties { unexpected } => format!(
            "{}: Unknown field{}: {}",
            error.instance_path(),
            if unexpected.len().gt(&1) { "s" } else { "" },
            unexpected.join(", ")
        ),
        _ => format!("{}: {}", error.instance_path(), error),
    }
}

pub struct TriggerTemplate;
impl Linter for TriggerTemplate {
    fn lint(target: &Path) -> Result<Vec<String>, String> {
        let crd: Value =
            serde_yaml::from_str(TRIGGER_TEMPLATE_CRD).or(Err("Unable to fetch CRD"))?;
        let f = std::fs::File::open(target).or(Err("Unable to open file at that path"))?;
        let target_obj: Value = serde_yaml::from_reader(f).or(Err("Template is not valid YAML"))?;
        let version: &str = target_obj
            .get("apiVersion")
            .and_then(Value::as_str)
            .ok_or("Missing apiVersion")?
            .split("/")
            .last()
            .unwrap_or("v1alpha1");
        let Some(version_obj) = crd["spec"]["versions"]
            .as_array()
            .expect("CRD should contain at least one version")
            .iter()
            .find(|v| v["name"] == version)
        else {
            return Err(
                "No ClusterTriggerTemplate definition matches the specified apiVersion".into(),
            );
        };
        let mut schema = version_obj["schema"]["openAPIV3Schema"].clone();

        // Kubernetes does not support unknown fields but jsonschema validation does, so it is necessary
        // to manually restrict the properties of each field
        restrict_schema(&mut schema);

        let spec = json!({"spec": target_obj["spec"]});

        let validator = jsonschema::validator_for(&schema).expect("Could not construct validator");
        let mut errors = vec![];
        for error in validator.iter_errors(&spec) {
            errors.push(format_error(&error, &schema));
        }

        Ok(errors)
    }
}
