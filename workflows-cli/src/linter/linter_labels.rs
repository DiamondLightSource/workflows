use crate::linter::base_linting::{Linter, get_manifest};
use serde::Deserialize;
use serde_yaml::Value;
use std::{
    fmt::{self},
    path::Path,
    vec,
};

const RULES_YAML: &str = include_str!("../../../.workflow_metadata_ruleset.yaml");

pub struct LabelChecker {
    rules: Rules,
}

impl Linter for LabelChecker {
    fn lint(target: &Path) -> Result<Vec<String>, String> {
        let manifest = get_manifest(target)?;
        let label_checker = LabelChecker::new()?;

        let metadata = manifest
            .as_mapping()
            .ok_or("Invalid manifest: expected a YAML object (key-value pairs), but got a different type.")?
            .get("metadata")
            .ok_or("Invalid manifest: metadata is missing. Metadata must be an object containing fields like name, labels and annotations. The metadata format is described at https://diamondlightsource.github.io/workflows/docs")?;

        let labels = metadata.get("labels").ok_or("Invalid labels: Labels are missing. The labels format is described at https://diamondlightsource.github.io/workflows/docs")?;
        let annotations = metadata
            .get("annotations")
            .ok_or("Invalid annotations: Annotations are missing. The annotations format is described at https://diamondlightsource.github.io/workflows/docs")?;

        label_checker.validate(labels, annotations)
    }
}

impl LabelChecker {
    fn build_rules() -> Result<Rules, String> {
        serde_yaml::from_str(RULES_YAML).map_err(|e| format!("Failed to parse rules: {e}"))
    }

    fn new() -> Result<LabelChecker, String> {
        let rules = Self::build_rules()?;
        Ok(LabelChecker { rules })
    }

    fn validate(&self, labels: &Value, annotations: &Value) -> Result<Vec<String>, String> {
        let mut errors = vec![];

        for rule in &self.rules.critical {
            if let Err(e) = rule.check(labels, annotations) {
                errors.push(e);
            }
        }

        Ok(errors)
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum CriticalRule {
    #[serde(rename = "stem")]
    Stem(Stem),
    #[serde(rename = "requiredKey")]
    RequiredKey(RequiredKey),
}

#[derive(Debug, Deserialize)]
struct Rules {
    critical: Vec<CriticalRule>,
}

#[derive(Debug, Deserialize)]
struct RequiredKey {
    key: String,
    location: Location,
}

#[derive(Debug, Deserialize)]
struct Stem {
    stem: String,
    #[serde(rename = "possibleValues")]
    possible_values: Vec<String>,
    location: Location,
}

#[derive(Debug, Deserialize)]
enum Location {
    #[serde(rename = "annotation")]
    Annotation,
    #[serde(rename = "label")]
    Label,
}

impl fmt::Display for Location {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Annotation => write!(f, "annotations"),
            Self::Label => write!(f, "labels"),
        }
    }
}

trait RuleChecker {
    fn check(&self, labels: &Value, annotations: &Value) -> Result<(), String>;
}

impl RuleChecker for CriticalRule {
    fn check(&self, labels: &Value, annotations: &Value) -> Result<(), String> {
        match self {
            CriticalRule::RequiredKey(m) => m.check(labels, annotations),
            CriticalRule::Stem(s) => s.check(labels, annotations),
        }
    }
}

impl RuleChecker for RequiredKey {
    fn check(&self, labels: &Value, annotations: &Value) -> Result<(), String> {
        let exists = match self.location {
            Location::Annotation => annotations.get(&self.key),
            Location::Label => labels.get(&self.key),
        };
        if exists.is_none() {
            let msg = format!("Expected {} in {}", self.key, self.location);
            return Err(msg);
        }
        Ok(())
    }
}

impl RuleChecker for Stem {
    fn check(&self, labels: &Value, annotations: &Value) -> Result<(), String> {
        let mut entries: Vec<(String, &Value)> = vec![];

        for option in &self.possible_values {
            let formatted_option = format!("{}-{}", self.stem, option);

            let value = match self.location {
                Location::Annotation => annotations.get(&formatted_option),
                Location::Label => labels.get(&formatted_option),
            };

            if let Some(val) = value {
                entries.push((formatted_option.clone(), val));
            }
        }

        if entries.is_empty() {
            let msg = format!(
                "Expected {}-<{}> in {}",
                self.stem,
                self.possible_values.join(", "),
                self.location
            );
            return Err(msg);
        }

        let malformed_tags: Vec<&(String, &Value)> = entries
            .iter()
            .filter(|(_, value)| *value != "true" && *value != "false")
            .collect();
        if !malformed_tags.is_empty() {
            let failed_tags = malformed_tags
                .iter()
                .map(|(key, _)| key.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            let msg = format!(
                "Expected values to be 'true' or 'false'. The following tags failed: {failed_tags}"
            );
            return Err(msg);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use serde_yaml::Value;

    use crate::linter::linter_labels::LabelChecker;

    fn yaml_from_str(yaml: &str) -> Value {
        serde_yaml::from_str(yaml).expect("YAML parsing failed")
    }

    #[test]
    fn passing_workflow() {
        let manifest_yaml = r#"
            metadata:
              labels:
                workflows.diamond.ac.uk/science-group-mx: "true"
              annotations:
                workflows.diamond.ac.uk/repository: "some-value"
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert!(result.is_empty())
    }

    #[test]
    fn failing_labels() {
        let manifest_yaml = r#"
            metadata:
              labels:
                placeholder_label: "value"
              annotations:
                workflows.diamond.ac.uk/repository: "some-value"
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert_eq!(
            result,
            vec![
                "Expected workflows.diamond.ac.uk/science-group-<mx, examples, magnetic-materials, condensed-matter, imaging, bio-cryo-imaging, surfaces, crystallography, spectroscopy> in labels"
            ]
        )
    }

    #[test]
    fn failing_annotations() {
        let manifest_yaml = r#"
            metadata:
              labels:
                workflows.diamond.ac.uk/science-group-mx: "true"
              annotations:
                placeholder: value
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert_eq!(
            result,
            vec!["Expected workflows.diamond.ac.uk/repository in annotations"]
        )
    }

    #[test]
    fn incorrect_bool_formatting() {
        let manifest_yaml = r#"
            metadata:
              labels:
                workflows.diamond.ac.uk/science-group-mx: "yes"
              annotations:
                workflows.diamond.ac.uk/repository: "some-value"
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert_eq!(
            result,
            vec![
                "Expected values to be 'true' or 'false'. The following tags failed: workflows.diamond.ac.uk/science-group-mx"
            ]
        )
    }

    #[test]
    fn wrong_labels_and_annotations() {
        let manifest_yaml = r#"
            metadata:
              labels:
                workflows.diamond.ac.uk/science-group-mx: "yes"
              annotations:
                missing.repository: "true"
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert_eq!(result.len(), 2);
        assert!(result.contains(&"Expected values to be 'true' or 'false'. The following tags failed: workflows.diamond.ac.uk/science-group-mx".to_string()));
        assert!(
            result.contains(
                &"Expected workflows.diamond.ac.uk/repository in annotations".to_string()
            )
        );
    }

    #[test]
    fn many_science_groups_one_broken() {
        let manifest_yaml = r#"
            metadata:
              labels:
                workflows.diamond.ac.uk/science-group-mx: "true"
                workflows.diamond.ac.uk/science-group-examples: "yes"
              annotations:
                workflows.diamond.ac.uk/repository: "some-value"
        "#;

        let manifest = yaml_from_str(manifest_yaml);
        let metadata = manifest.get("metadata").unwrap();

        let labels = metadata.get("labels").unwrap();
        let annotations = metadata.get("annotations").unwrap();

        let checker = LabelChecker::new().unwrap();
        let result = checker.validate(labels, annotations).unwrap();

        assert_eq!(result, vec!["Expected values to be 'true' or 'false'. The following tags failed: workflows.diamond.ac.uk/science-group-examples".to_string()]);
    }
}
