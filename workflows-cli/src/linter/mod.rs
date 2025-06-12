mod common;
mod helm;
use clap::ValueEnum;
use common::lint_path;
use std::fs::read_dir;
use std::path::PathBuf;

use crate::LintArgs;

#[derive(Debug, Clone, ValueEnum)]
#[clap(rename_all = "lower")]
pub enum ManifestType {
    Manifest,
    Helm,
}

#[derive(Debug)]
struct LintResult {
    name: String,
    errors: Vec<String>,
}

impl LintResult {
    fn new(name: String, errors: Vec<String>) -> Self {
        Self { name, errors }
    }
}

/// Linter entrypoint
pub fn lint(args: LintArgs) {
    let results = if let Some(config_file) = &args.config_file {
        lint_from_config(config_file)
    } else {
        match &args.manifest_type {
            ManifestType::Manifest => lint_from_manifest(&args.file_name, args.all),
            ManifestType::Helm => lint_from_helm(&args.file_name, args.all),
        }
    };

    match results {
        Ok(results) => print_and_exit(results),
        Err(e) => println!("Something went wrong while linting:\n{}", e),
    }
}

fn lint_from_config(_config_file: &PathBuf) -> Result<Vec<LintResult>, String> {
    Err("Not implimented".to_string())
}

fn lint_from_helm(target: &PathBuf, all: bool) -> Result<Vec<LintResult>, String> {
    

    Ok(vec![])
}

fn lint_from_manifest(target: &PathBuf, all: bool) -> Result<Vec<LintResult>, String> {
    let paths = if all {
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
        vec![target.clone()]
    };

    Ok(paths
        .iter()
        .map(|path| match lint_path(path) {
            Ok(result) => result,
            Err(error) => LintResult::new(path.to_str().unwrap().to_string(), vec![error]),
        })
        .collect())
}

fn print_and_exit(results: Vec<LintResult>) {
    match results.iter().any(|result| !result.errors.is_empty()) {
        true => std::process::exit(1),
        false => std::process::exit(0),
    }
}
