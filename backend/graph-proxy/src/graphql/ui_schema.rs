use std::collections::HashMap;

use serde::{Deserialize, Serialize};

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
    Category(UiSchemaCategory),
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
    label: String,
    elements: Vec<UiSchema>,
    options: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {

    use super::UiSchema;
    use super::UiSchemaCategory;
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
            options: Some(json!({"detail" : "DEFAULT"})),
        });
        let actual = UiSchema::new(&annotations).expect("Failed to parse valid JSON form Control.");
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
        let expected = Some(UiSchema::Group {
            label: "foo".into(),
            elements: vec![control],
            options: Some(json!({"collapsible":true})),
        });
        let actual = UiSchema::new(&annotations).expect("Failed to parse valid JSON form Group.");
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
            label: "foo".into(),
            elements: vec![],
            options: None,
        };
        let expected = Some(UiSchema::Categorization {
            elements: vec![category],
            options: Some(json!({"variant": "stepper"})),
        });
        let actual =
            UiSchema::new(&annotations).expect("Failed to parse valid JSON form Categorization.");

        let serialized =
            serde_json::to_string(&actual).expect("Failed to serialize Categorization");
        let deserialized = serde_json::from_str::<UiSchema>(&serialized).ok();

        assert_eq!(expected, actual);
        assert_eq!(expected, deserialized);
    }

    #[test]
    fn annotation_with_category() {
        let annotations = HashMap::from([(
            "workflows.diamond.ac.uk/ui-schema".to_string(),
            json!({
                    "type": "Category",
                    "label": "foo",
                    "elements": []
            })
            .to_string(),
        )]);
        let category = UiSchemaCategory {
            label: "foo".into(),
            elements: vec![],
            options: None,
        };
        let expected = Some(UiSchema::Category(category));
        let actual =
            UiSchema::new(&annotations).expect("Failed to parse valid JSON forms Category.");

        let serialized = serde_json::to_string(&actual).expect("Failed to serialize Category");
        let deserialized = serde_json::from_str::<UiSchema>(&serialized).ok();

        assert_eq!(expected, actual);
        assert_eq!(expected, deserialized);
    }
}
