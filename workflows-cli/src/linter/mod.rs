#![allow(clippy::missing_docs_in_private_items)]

mod base_linting;

use base_linting::lint_from_manifest;
mod helm;
use helm::lint_from_helm;
mod config_linting;

use clap::ValueEnum;

use crate::{LintArgs, LintConfigArgs, linter::config_linting::lint_from_config};

/// Supported manifest
#[derive(Debug, Clone, ValueEnum)]
#[clap(rename_all = "lower")]
pub enum ManifestType {
    Manifest,
    Helm,
}

#[derive(Debug, PartialEq, PartialOrd, Eq, Ord)]
struct LintResult {
    name: String,
    errors: Vec<String>,
}

impl LintResult {
    fn new(name: String, errors: Vec<String>) -> Self {
        Self { name, errors }
    }
}

pub fn config_lint(args: LintConfigArgs) {
    lint_from_config(&args.config_file);
}

/// Linter entrypoint
pub fn lint(args: LintArgs) {
    let results = match &args.manifest_type {
        ManifestType::Manifest => lint_from_manifest(&args.file_name, args.all),
        ManifestType::Helm => lint_from_helm(&args.file_name, args.all),
    };

    match results {
        Ok(results) => print_and_exit(results),
        Err(e) => println!("Something went wrong while linting:\n{}", e),
    }
}

fn print_and_exit(results: Vec<LintResult>) {
    results.iter().for_each(|result| {
        print!("Template Name: {} - ", result.name);

        if result.errors.is_empty() {
            println!("No errors");
        } else {
            eprintln!("Errors found");
            result.errors.iter().for_each(|e| println!("  - {}", e));
        }
    });
    match results.iter().any(|result| !result.errors.is_empty()) {
        true => std::process::exit(1),
        false => std::process::exit(0),
    }
}

#[cfg(test)]
mod tests {
    // Theses tests use the MockCommand runner, rather than the real Command library.
    // This lets us mock the output of argo/helm/etc in tests so the actual binaries
    // and sample workflows aren't needed for unit testing.

    // By default, the real Command library will be used, but for testing you should
    // switch to the Mock version by setting WORKFLOWS_CLI_TEST_ENABLE_MOCK_COMMAND=1.
    // The mock command runner will lookup the intended command in the mock_commands
    // list (found in tests/mock_commands.yaml), and then return a configured response,
    // bypassing the need to have the underlying CLI installed, and making tests
    // repeatable.

    // Each test will set an active_mapping, which dictates which corresponds to a key
    // in mock_commands.yaml that the command outputs will be taken from.

    // Usage: WORKFLOWS_CLI_TEST_ENABLE_MOCK_COMMAND=1 cargo test

    use std::env;
    use std::path::Path;

    use serial_test::serial;

    use crate::linter::{LintResult, base_linting::lint_from_manifest, helm::lint_from_helm};

    fn have_same_elements<T: Ord>(result: &mut Vec<T>, expected: &mut Vec<T>) -> bool {
        result.sort();
        expected.sort();
        result == expected
    }

    #[test]
    #[serial]
    fn lint_single_passing_manifest() {
        // Setting env variables is unsafe in multi-threaded programs, but safe in single-threaded
        // We add the [serial] macro to force tests to run in series to make this safe.
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "passing_manifest");
        }
        let path = Path::new("./tests/manifests/workflow1.yaml").to_path_buf();
        let mut result = lint_from_manifest(&path, false).unwrap();

        let mut expected_result = vec![LintResult::new("template1".to_string(), vec![])];

        println!("Response: {:?}", result);
        assert!(have_same_elements(&mut result, &mut expected_result));
        assert_eq!(result, expected_result);
    }
    #[test]
    #[serial]
    fn lint_many_passing_manifest() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "passing_manifest");
        }
        let path = Path::new("./tests/manifests").to_path_buf();
        let mut result = lint_from_manifest(&path, true).unwrap();

        let mut expected_result = vec![
            LintResult::new("template1".to_string(), vec![]),
            LintResult::new("template2".to_string(), vec![]),
            LintResult::new("template3".to_string(), vec![]),
        ];

        println!("Response: {:?}", result);
        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    #[test]
    #[serial]
    fn lint_all_on_single_workflow() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "passing_manifest");
        }
        let path = Path::new("./tests/manifests/workflow1.yaml").to_path_buf();
        let result = lint_from_manifest(&path, true);

        assert!(result.is_err());

        let err_msg = result.unwrap_err();
        assert!(
            err_msg.contains("Error reading directory"),
            "Unexpected error message: {}",
            err_msg
        );
    }

    #[test]
    #[serial]
    fn failing_manifest() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "failing_manifest");
        }
        let path = Path::new("./tests/manifests/workflow1.yaml").to_path_buf();
        let result = lint_from_manifest(&path, false).unwrap();

        let expected_result = vec![
            LintResult::new("template1".to_string(), vec!["in numpy-benchmark (ClusterWorkflowTemplate): strict decoding error: unknown field spec.templates[0].inputs.command, unknown field spec.templates[0].inputs.env, unknown field spec.templates[0].inputs.image, unknown field spec.templates[0].inputs.source".to_string()]),
        ];
        assert_eq!(result, expected_result);
    }

    #[test]
    #[serial]
    fn many_failing() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "failing_manifest");
        }
        let path = Path::new("./tests/manifests/").to_path_buf();
        let mut result = lint_from_manifest(&path, true).unwrap();

        let mut expected_result = vec![
            LintResult::new("template1".to_string(), vec!["in numpy-benchmark (ClusterWorkflowTemplate): strict decoding error: unknown field spec.templates[0].inputs.command, unknown field spec.templates[0].inputs.env, unknown field spec.templates[0].inputs.image, unknown field spec.templates[0].inputs.source".to_string()]),
            LintResult::new("template2".to_string(), vec!["json: cannot unmarshal object into Go struct field DAGTemplate.spec.templates.dag.tasks of type []v1alpha1.DAGTask".to_string()]),
            LintResult::new("template3".to_string(), vec![]),
        ];
        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    #[test]
    #[serial]
    fn passing_lint_helm() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "passing_helm");
        }
        let path = Path::new("tests/charts/").to_path_buf();
        let mut result = lint_from_helm(&path, true).unwrap();

        let mut expected_result = vec![
            LintResult::new("template2".to_string(), vec![]),
            LintResult::new("template1".to_string(), vec![]),
        ];
        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    #[test]
    #[serial]
    fn failing_lint_helm() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "failing_helm");
        }
        let path = Path::new("tests/charts/").to_path_buf();
        let mut result = lint_from_helm(&path, true).unwrap();

        let mut expected_result = vec![
            LintResult::new("template2".to_string(), vec!["in numpy-benchmark (ClusterWorkflowTemplate): strict decoding error: unknown field spec.templates[0].inputs.command, unknown field spec.templates[0].inputs.env, unknown field spec.templates[0].inputs.image, unknown field spec.templates[0].inputs.source".to_string()]),
            LintResult::new("template1".to_string(), vec![]),
        ];
        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    #[test]
    #[serial]
    fn lint_one_chart() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "lint_one_helm_chart");
        }
        let path = Path::new("tests/charts/templates/workflow.yaml").to_path_buf();
        let mut result = lint_from_helm(&path, false).unwrap();

        let mut expected_result = vec![LintResult::new("template1".to_string(), vec![])];
        assert!(have_same_elements(&mut result, &mut expected_result));
    }
}
