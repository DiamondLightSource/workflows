#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]

//! CLI for working with Workflows at Diamond

/// Argo workflows linter wrapper
mod linter;
use std::{os::unix::process, path::PathBuf};

mod command_runner;

use clap::Parser;

use crate::{command_runner::get_command_factory, linter::ManifestType};

/// Workflows Tool
#[derive(Debug, Parser)]
#[allow(clippy::large_enum_variant)]
enum Cli {
    /// Lint the templates
    Lint(LintArgs),
}

/// Arguments for linting
#[derive(Debug, Parser)]
struct LintArgs {
    /// Location of the workflows-lint config file. Used when running as an action
    #[arg(long, env = "CONFIG_FILE")]
    config_file: Option<PathBuf>,

    #[arg(long, default_value = "manifest")]
    manifest_type: ManifestType,

    /// Lint all file in folder.
    /// Applies to all templates manifest type is helm chart
    #[arg(short, long)]
    all: bool,

    /// Path to manifest(s). Expects a file, or directory if --all
    file_name: PathBuf,
}

fn main() {
    let args = Cli::parse();

    if let Err(err) = ensure_cli() {
        println!("Error: {}", err);
        std::process::exit(1)
    }

    match args {
        Cli::Lint(args) => {
            linter::lint(args);
        }
    }
}

use std::process::Command;

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
