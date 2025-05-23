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

