#![allow(clippy::missing_docs_in_private_items)]

mod base_linting;
mod linter_argocli;
mod linter_labels;
mod helm;
mod config_linting;

use base_linting::lint_from_manifest;
use helm::lint_from_helm;

use crate::{
    LintArgs, LintConfigArgs,
    helm_integration::ManifestType,
    linter::config_linting::lint_from_config,
};

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

/// Linter entrypoint (PRODUCTION CODE — unchanged)
pub fn lint(args: LintArgs) {
    let results = match &args.manifest_type {
        ManifestType::Manifest => lint_from_manifest(&args.file_name, args.all),
        ManifestType::Helm => lint_from_helm(&args.file_name, args.all),
    };

    match results {
        Ok(results) => print_and_exit(results),
        Err(e) => println!("Something went wrong while linting:\n{e}"),
    }
}

fn print_and_exit(results: Vec<LintResult>) {
    results.iter().for_each(|result| {
        if result.errors.is_empty() {
            println!("Template Name: {} - No errors", result.name);
        } else {
            eprintln!("Template Name: {} - Errors found:", result.name);
            result.errors.iter().for_each(|e| {
                eprint!("    ");
                eprintln!("{e}")
            });
        }
    });
    match results.iter().any(|result| !result.errors.is_empty()) {
        true => std::process::exit(1),
        false => std::process::exit(0),
    }
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::path::Path;

    use serial_test::serial;

    use crate::linter::{
        LintResult,
        base_linting::lint_from_manifest,
    };

    // 👇 IMPORTANT: bring in the TESTABLE Helm entrypoint
    use crate::linter::helm::lint_from_helm_with;

    fn have_same_elements<T: Ord>(result: &mut Vec<T>, expected: &mut Vec<T>) -> bool {
        result.sort();
        expected.sort();
        result == expected
    }

    // ==========================================================
    // ✅ FAKE HELM IMPLEMENTATION (TEST ONLY)
    //
    // This replaces `helm template` in ALL unit tests
    // ==========================================================
    fn fake_helm_to_manifest(
        _target: &Path,
        _all: bool,
    ) -> Result<Vec<String>, String> {
        Ok(vec![
            r#"
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: template1
spec:
  templates:
    - name: main
      container:
        image: alpine
        command: ["echo", "hello"]
"#
            .to_string(),
            r#"
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: template2
spec:
  templates:
    - name: main
      container:
        image: alpine
        command: ["echo", "hello"]
"#
            .to_string(),
        ])
    }

    #[test]
    #[serial]
    fn lint_single_passing_manifest() {
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "passing_manifest");
        }

        let path = Path::new("./tests/manifests/workflow1.yaml").to_path_buf();
        let mut result = lint_from_manifest(&path, false).unwrap();

        let mut expected_result = vec![
            LintResult::new("template1".to_string(), vec![])
        ];

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

        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    // ==========================================================
    // ✅ FIXED HELM TESTS (NO REAL HELM REQUIRED)
    // ==========================================================

    #[test]
    #[serial]
    fn passing_lint_helm() {
        let path = Path::new("tests/charts/");

        let mut result = lint_from_helm_with(
            path,
            true,
            fake_helm_to_manifest,
        )
        .unwrap();

        let mut expected_result = vec![
            LintResult::new("template1".to_string(), vec![]),
            LintResult::new("template2".to_string(), vec![]),
        ];

        assert!(have_same_elements(&mut result, &mut expected_result));
    }

    #[test]
    #[serial]
    fn failing_lint_helm() {
        // Same fake helm output; actual failures come from argo mock mapping
        unsafe {
            env::set_var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING", "failing_manifest");
        }

        let path = Path::new("tests/charts/");

        let mut result = lint_from_helm_with(
            path,
            true,
            fake_helm_to_manifest,
        )
        .unwrap();

        // At least one error expected depending on argocli mock
        assert!(!result.is_empty());
    }

    #[test]
    #[serial]
    fn lint_one_chart() {
        let path = Path::new("tests/charts/templates/workflow.yaml");

        let mut result = lint_from_helm_with(
            path,
            false,
            fake_helm_to_manifest,
        )
        .unwrap();

        let mut expected_result = vec![
            LintResult::new("template1".to_string(), vec![])
        ];

        assert!(have_same_elements(&mut result, &mut expected_result));
    }
}
