use crate::linter::base_linting::{Linter, get_manifest};
use serde_yaml::Value;
use std::path::Path;

pub struct ParameterValueChecker;
impl Linter for ParameterValueChecker {
    fn lint(target: &Path) -> Result<Vec<String>, String> {
        let manifest = get_manifest(target)?;

        let mut errors = vec![];

        check_argument_parameters(&manifest, &mut errors);
        check_template_input_parameters(&manifest, &mut errors);

        Ok(errors)
    }
}

fn check_argument_parameters(manifest: &Value, errors: &mut Vec<String>) {
    let Some(parameters) = manifest["spec"]["arguments"]["parameters"].as_sequence() else {
        return;
    };

    for (idx, parameter) in parameters.iter().enumerate() {
        if let Some(value) = parameter.get("value")
            && !value.is_string()
        {
            errors.push(format!(
                "spec.arguments.parameters[{idx}].value must be a string"
            ));
        }
    }
}

fn check_template_input_parameters(manifest: &Value, errors: &mut Vec<String>) {
    let Some(templates) = manifest["spec"]["templates"].as_sequence() else {
        return;
    };

    for (template_idx, template) in templates.iter().enumerate() {
        let Some(parameters) = template["inputs"]["parameters"].as_sequence() else {
            continue;
        };

        for (param_idx, parameter) in parameters.iter().enumerate() {
            if let Some(value) = parameter.get("value")
                && !value.is_string()
            {
                errors.push(format!(
                    "spec.templates[{template_idx}].inputs.parameters[{param_idx}].value must be a string"
                ));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn yaml_from_str(yaml: &str) -> Value {
        serde_yaml::from_str(yaml).unwrap()
    }

    #[test]
    fn accepts_string_argument_parameter_value() {
        let manifest = yaml_from_str(
            r#"
spec:
  arguments:
    parameters:
      - name: count
        value: "123"
"#,
        );

        let mut errors = vec![];

        check_argument_parameters(&manifest, &mut errors);

        assert!(errors.is_empty());
    }

    #[test]
    fn rejects_numeric_argument_parameter_value() {
        let manifest = yaml_from_str(
            r#"
spec:
  arguments:
    parameters:
      - name: count
        value: 123
"#,
        );

        let mut errors = vec![];

        check_argument_parameters(&manifest, &mut errors);

        assert_eq!(
            errors,
            vec!["spec.arguments.parameters[0].value must be a string"]
        );
    }

    #[test]
    fn rejects_boolean_argument_parameter_value() {
        let manifest = yaml_from_str(
            r#"
spec:
  arguments:
    parameters:
      - name: enabled
        value: true
"#,
        );

        let mut errors = vec![];

        check_argument_parameters(&manifest, &mut errors);

        assert_eq!(
            errors,
            vec!["spec.arguments.parameters[0].value must be a string"]
        );
    }

    #[test]
    fn rejects_numeric_input_parameter_value() {
        let manifest = yaml_from_str(
            r#"
spec:
  templates:
    - name: main
      inputs:
        parameters:
          - name: count
            value: 123
"#,
        );

        let mut errors = vec![];

        check_template_input_parameters(&manifest, &mut errors);

        assert_eq!(
            errors,
            vec!["spec.templates[0].inputs.parameters[0].value must be a string"]
        );
    }
}
