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
        options: Option<serde_json::Value>,
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
        options: Option<serde_json::Value>,
    },
    Categorization {
        elements: Vec<UiSchemaCategory>,
        options: Option<serde_json::Value>,
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
    use crate::graphql::ui_schema::UiSchemaCategory;

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
                    options: None,
                },
                UiSchema::Control {
                    scope: "#/properties/bar".to_string(),
                    label: None,
                    options: None,
                },
            ],
        });
        assert_eq!(expected, UiSchema::new(&annotations).unwrap());
    }

    #[test]
    fn no_annotation_is_none() {
        assert_eq!(None, UiSchema::new(&HashMap::new()).unwrap());
    }

    #[test]
    fn annotation_with_control() {
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/ui-schema".to_string(),
            json!({
                        "type": "Control",
                        "scope": "#/properties/foo",
                        "options": {
                            "detail" : "DEFAULT"
                        }
            })
            .to_string(),
        )]);
        let expected = Some(UiSchema::Control {
            scope: "#/properties/foo".into(),
            label: None,
            options: Some(json!({"detail" : "DEFAULT"}))
            });
        let actual = UiSchema::new(&annotations).expect("Failed to parse valid JSON form.");
        assert_eq!(expected, actual);
    }

    #[test]
    fn annotation_with_group() {
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/ui-schema".to_string(),
            json!({
                "type": "Group",
                "label": "foo",
                "elements": [
                    {
                    "type": "Control",
                    "scope": "#/properties/bar"
                    },
                ],
                "options": {
                    "collapsible": true,
                }
            })
            .to_string(),
        )]);
        let control = UiSchema::Control {
            scope: "#/properties/bar".into(),
            label: None,
            options: None,
            };
        let expected = Some(UiSchema::Group { label: "foo".into(), elements: vec![control], options: Some(json!({"collapsible":true})) });
        let actual = UiSchema::new(&annotations).expect("Failed to parse valid JSON form.");
        assert_eq!(expected, actual);
    }

    #[test]
    fn annotation_with_categorization() {
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/ui-schema".to_string(),
            json!({
                "type": "Categorization",
                "elements": [
                    {
                    "type": "Category",
                    "label": "foo",
                    "elements": [],
                    },
                ],
                "options": {
                    "variant": "stepper"
                }
            })
            .to_string(),
        )]);
        let category = UiSchemaCategory {
            r#type: (),
            label: "foo".into(),
            elements: vec![],
            };
        let expected = Some(UiSchema::Categorization { elements: vec![category], options: Some(json!({"variant":"stepper"})) });
        let actual = UiSchema::new(&annotations).expect("Failed to parse valid JSON form.");
        assert_eq!(expected, actual);
    }
}

