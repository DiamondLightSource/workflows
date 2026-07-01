#![allow(clippy::missing_docs_in_private_items)]

use serde_yaml::Value;
use std::fs::{read_dir, read_to_string};
use std::path::{Path, PathBuf};

use crate::linter::linter_argocli::ArgoCLI;
use crate::linter::linter_labels::LabelChecker;

use super::LintResult;

/// Lint manifests from a file or directory.
///
/// IMPORTANT:
/// When linting Helm charts, manifests are first rendered and written
/// as temporary files (e.g. /tmp/argo-lint/workflow_0.yaml).
///
/// These files are *generated artifacts* and MUST NOT be reported as
/// user-authored templates. We therefore explicitly filter them out here.
pub fn lint_from_manifest(target: &Path, all: bool) -> Result<Vec<LintResult>, String> {
    let paths: Vec<PathBuf> = if all {
        match read_dir(target) {
            Ok(entries) => entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                // FILTER: skip Helm-generated temp files
                .filter(|path| !is_generated_helm_file(path))
                .collect(),
            Err(e) => {
                return Err(format!(
                    "Error reading directory {}: {}",
                    target.display(),
                    e
                ));
            }
        }
    } else {
        let path = target.to_path_buf();

        // FILTER: skip Helm-generated temp files
        if is_generated_helm_file(&path) {
            return Ok(vec![]);
        }

        vec![path]
    };

    Ok(paths
        .iter()
        .map(|path| match lint_path(path) {
            Ok(result) => result,
            Err(error) => {
                LintResult::new(path.to_str().unwrap_or_default().to_string(), vec![error])
            }
        })
        .collect())
}

/// Detect Helm-generated temporary workflow files.
///
/// Helm-rendered manifests are written as:
///   /tmp/argo-lint/workflow_<n>.yaml
///
/// These are intermediate artifacts and should never appear
/// in user-facing lint reports.
fn is_generated_helm_file(path: &Path) -> bool {
    path.to_string_lossy().contains("/tmp/argo-lint/")
        && path
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with("workflow_"))
            .unwrap_or(false)
}

fn lint_path(target: &Path) -> Result<LintResult, String> {
    let template_name = get_template_name(target)?;
    let result = lint_template(target)?;
    Ok(LintResult::new(template_name, result))
}

pub fn get_manifest(target: &Path) -> Result<Value, String> {
    let yaml = read_to_string(target)
        .map_err(|err| format!("Couldn't read file {}: {}", target.display(), err))?;

    let doc: Value =
        serde_yaml::from_str(&yaml).map_err(|e| format!("Could not parse manifest: {e}"))?;

    Ok(doc)
}

fn get_template_name(path: &Path) -> Result<String, String> {
    let yaml = get_manifest(path)?;

    let name = yaml["metadata"]["name"]
        .as_str()
        .or_else(|| yaml["metadata"]["generateName"].as_str())
        .ok_or("Template has no name")?
        .to_string();

    Ok(name)
}

fn lint_template(target: &Path) -> Result<Vec<String>, String> {
    let mut errors = vec![];
    errors.extend(ArgoCLI::lint(target)?);
    errors.extend(LabelChecker::lint(target)?);
    Ok(errors)
}

pub trait Linter {
    /// Run linting rules against a manifest file.
    ///
    /// NOTE:
    /// This operates on files rather than parsed YAML because
    /// the Argo CLI cannot lint from stdin in offline mode.
    fn lint(target: &Path) -> Result<Vec<String>, String>;
}
