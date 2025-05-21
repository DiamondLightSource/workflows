use std::collections::HashMap;

use serde::{Deserialize, Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
#[allow(clippy::missing_docs_in_private_items)]
pub(super) enum UiSchemaError {
    #[error(r#"metadata.labels."workflows.diamond.ac.uk/ui-schema" could not be parsed: {0}"#)]
    Unparsable(serde_json::Error),
}

/// A JSON Forms UI Schema
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
#[allow(clippy::missing_docs_in_private_items)]
pub(super) enum UiSchema {
    Control {
        scope: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<String>,
    },
    HorizontalLayout {
        elements: Vec<UiSchema>,
        options: Option<serde_json::Value>,
    },
    VerticalLayout {
        elements: Vec<UiSchema>,
        options: Option<serde_json::Value>,
    },
    Group {
        label: String,
        elements: Vec<UiSchema>,
    },
    Categorization {
        elements: Vec<UiSchemaCategory>,
    },
}

impl UiSchema {
    /// Retrieves the UI Schema from the annotations on a [`WorkflowTemplate`], returns an error if parsing fails
    pub(super) fn new(
        annotations: &HashMap<String, String>,
    ) -> Result<Option<Self>, UiSchemaError> {
        annotations
            .get("workflows.diamond.ac.uk/ui-schema")
            .map(|annotation| serde_json::from_str(annotation))
            .transpose()
            .map_err(UiSchemaError::Unparsable)
    }
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[allow(clippy::missing_docs_in_private_items)]
pub(super) struct UiSchemaCategory {
    #[serde(serialize_with = "UiSchemaCategory::r#type")]
    r#type: (),
    label: String,
    elements: Vec<UiSchema>,
}

impl UiSchemaCategory {
    #[allow(clippy::missing_docs_in_private_items)]
    fn r#type<S: Serializer>(_: &(), s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str("category")
    }
}

#[cfg(test)]
mod tests {
    use super::UiSchema;
    use serde_json::json;
    use std::collections::HashMap;

    #[test]
    fn annotation_used() {
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/ui-schema".to_string(),
            json!({
                "type": "HorizontalLayout",
                "elements": [
                    {
                        "type": "Control",
                        "scope": "#/properties/foo",
                        "label": "Foo"
                    },
                    {
                        "type": "Control",
                        "scope": "#/properties/bar"
                    }
                ]
            })
            .to_string(),
        )]);
        let expected = Some(UiSchema::HorizontalLayout {
            options: None,
            elements: vec![
                UiSchema::Control {
                    scope: "#/properties/foo".to_string(),
                    label: Some("Foo".to_string()),
                },
                UiSchema::Control {
                    scope: "#/properties/bar".to_string(),
                    label: None,
                },
            ],
        });
        assert_eq!(expected, UiSchema::new(&annotations).unwrap());
    }

    #[test]
    fn no_annotation_is_none() {
        assert_eq!(None, UiSchema::new(&HashMap::new()).unwrap());
    }
}
