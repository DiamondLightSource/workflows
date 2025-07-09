#![warn(missing_docs)]
#![allow(clippy::missing_docs_in_private_items)]
//! CLI for working with Workflows at Diamond

/// Argo workflows linter wrapper
mod linter;

/// Submit workflows and templates
mod submit_workflow;

/// Wraps command to allow mocking
mod command_runner;

/// Common structs and functions between CLI options
mod helm_integration;
use helm_integration::ManifestType;

use clap::Parser;
use std::path::PathBuf;
use std::process::Command;

/// Workflows Tool
#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    /// Lint the templates
    Lint(LintArgs),
    /// Lint from a config file
    LintConfig(LintConfigArgs),
    /// Submit workflows and templates
    Submit(SubmitArgs),
}

/// Arguments for linting from a configfile
#[derive(Debug, Parser)]
struct LintConfigArgs {
    /// Location of the workflows-lint config file. Used when running as an action
    config_file: PathBuf,
}

/// Arguments for linting
#[derive(Debug, Parser)]
struct LintArgs {
    /// Target either conventionaly WorkflowTemplates, or helm based templates
    #[arg(long, default_value = "manifest")]
    manifest_type: ManifestType,

    /// Lint all file in folder or chart.
    #[arg(short, long)]
    all: bool,

    /// Path to manifest(s). Expects a file, or directory if --all
    file_name: PathBuf,
}

/// Test workflow templates
#[derive(Debug, Parser)]
struct SubmitArgs {
    /// Type of template. Either manifest or helm
    #[arg(long, default_value = "manifest")]
    manifest_type: ManifestType,

    /// Target session to run the workflow
    #[arg(long, short)]
    session: String,

    /// Path to workflow template being linted
    file_path: PathBuf,
}

fn main() {
    let args = Cli::parse();

    if let Err(err) = ensure_cli() {
        eprintln!("Error: {err}");
        std::process::exit(1)
    }

    match args {
        Cli::Lint(args) => {
            linter::lint(args);
        }
        Cli::LintConfig(args) => {
            linter::config_lint(args);
        }
        Cli::Submit(args) => {
            submit_workflow::submit(args);
        }
    }
}

/// Checks the underlying argo and helm CLI are present
fn ensure_cli() -> Result<(), String> {
    let helm_output = Command::new("which")
        .arg("helm")
        .output()
        .map_err(|_| "Failed to run 'which helm'. Is it installed?")?;

    if !helm_output.status.success() {
        return Err("Could not find 'helm' on PATH. Is it installed?".into());
    }

    let argo_output = Command::new("which")
        .arg("argo")
        .output()
        .map_err(|_| "Failed to run 'which argo'. Is it installed?")?;

    if !argo_output.status.success() {
        return Err("Could not find 'argo' on PATH. Is it installed?".into());
    }

    Ok(())
}
