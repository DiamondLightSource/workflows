#![allow(clippy::missing_docs_in_private_items)]
use serde_yaml::Value;

use crate::linter::linter_argocli::ArgoCLI;
use crate::linter::linter_labels::LabelChecker;

use super::LintResult;
use std::fs::{read_dir, read_to_string};
use std::path::{Path, PathBuf};

pub fn lint_from_manifest(target: &Path, all: bool) -> Result<Vec<LintResult>, String> {
    let paths: Vec<PathBuf> = if all {
        match read_dir(target) {
            Ok(entries) => entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .collect(),
            Err(e) => {
                let msg = format!("Error reading directory {}: {}", target.display(), e);
                return Err(msg);
            }
        }
    } else {
        vec![target.to_path_buf()]
    };

    Ok(paths
        .iter()
        .map(|path| match lint_path(path) {
            Ok(result) => result,
            Err(error) => LintResult::new(path.to_str().unwrap().to_string(), vec![error]),
        })
        .collect())
}

fn lint_path(target: &Path) -> Result<LintResult, String> {
    let template_name = get_template_name(target)?;
    let result = lint_template(target)?;
    Ok(LintResult::new(template_name, result))
}

pub fn get_manifest(target: &Path) -> Result<Value, String> {
    let yaml = read_to_string(target)
        .map_err(|err| format!("Couldn't read file {}: {}", target.display(), err))?;

    let doc: Value = serde_yaml::from_str(&yaml)
        .map_err(|e| format!("Could not parse manifest to string: {e}"))?;

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
    // The lint function takes path, rather than manifest. This is not ideal as it requires a tmp file
    // to be opened in every linter, and then linted - rather than opened once and shared.
    // The argo CLI has a bug where it cannot lint from stdin in '--offline' mode so we must lint from a file.
    // Once this is fixed, we should refactor the lint function to take a reference to the yaml.
    // https://github.com/argoproj/argo-workflows/issues/12819
    fn lint(target: &Path) -> Result<Vec<String>, String>;
}
