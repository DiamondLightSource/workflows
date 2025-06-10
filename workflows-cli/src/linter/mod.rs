mod common;
use crate::command_runner::{self, CommandFactory, get_command_factory};
use common::lint_path;
use std::fs::{read_dir, read_to_string};
use std::path::{Path, PathBuf};

use clap::ValueEnum;
use yaml_rust2::YamlLoader;

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

    println!("Results:\n{:#?}", results);

    match results.iter().any(|result| !result.errors.is_empty()) {
        true => std::process::exit(1),
        false => std::process::exit(0),
    }
}

fn lint_from_config(_config_file: &PathBuf) -> Vec<LintResult> {
    vec![]
}

fn lint_from_helm(target: &PathBuf, all: bool) -> Vec<LintResult> {
    let tmp_dir = Path::new("/tmp/argo-lint");

    if all {
        if let Ok(mut files) = read_dir(target) {
            let has_chart = files.any(|f| {
                f.ok()
                    .and_then(|entry| entry.file_name().to_str().map(|name| name == "Chart.yaml"))
                    .unwrap_or(false)
            });

            if !has_chart {
                let err = format!("Could not find 'Chart.yaml' in {} ", target.display());
                return vec![LintResult::new(
                    target.to_str().unwrap().to_string(),
                    vec![err],
                )];
            }

            let helm_out = get_command_factory()
                .new_command("helm")
                .arg("template")
                .arg(target.to_str().unwrap())
                .output();
            let charts = match helm_out {
                Ok(helm) => helm,
                Err(e) => {
                    let err = format!("Could not build helm templates. {}", e);
                    return vec![LintResult::new(
                        target.to_str().unwrap().to_string(),
                        vec![err],
                    )];
                }
            };

            let manifests: Vec<String> = String::from_utf8_lossy(&charts.stdout)
                .split("---")
                .filter(|s| !s.is_empty())
                .map(str::to_string)
                .collect();

            if let Err(e) = write_to_clean_folder(tmp_dir, manifests) {
                let err = format!("Error writing to /tmp: {}", e);
                return vec![LintResult::new(
                    target.to_str().unwrap().to_string(),
                    vec![err],
                )];
            }

            let tmp_path  = tmp_dir.into();
            return lint_from_manifest(&tmp_path, true)
            

        } else {
            let err = format!(
                "Could not build helm templates. {} should be a directory with chart.yaml in it.",
                target.display()
            );
            return vec![LintResult::new(
                target.to_str().unwrap().to_string(),
                vec![err],
            )];
        }
    }

    vec![]
}

fn lint_from_manifest(target: &PathBuf, all: bool) -> Vec<LintResult> {
    let paths = if all {
        match read_dir(target) {
            Ok(entries) => entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .collect(),
            Err(e) => {
                let msg = format!("Error reading directory {}: {}", target.display(), e);
                let result = LintResult::new(target.to_str().unwrap().to_string(), vec![msg]);
                return vec![result];
            }
        }
    } else {
        vec![target.clone()]
    };

    paths
        .iter()
        .map(|path| match lint_path(path) {
            Ok(result) => result,
            Err(error) => LintResult::new(path.to_str().unwrap().to_string(), vec![error]),
        })
        .collect()
}



use std::fs;
use std::fs::File;
use std::io::Write;

fn write_to_clean_folder(path: &Path, contents: Vec<String>) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        if entry_path.is_file() {
            fs::remove_file(entry_path)?;
        } else if entry_path.is_dir() {
            fs::remove_dir_all(entry_path)?;
        }
    }

    for (i, content) in contents.iter().enumerate() {
        let file_path = path.join(format!("workflow_{}.yaml", i));
        let mut file = File::create(file_path)?;
        file.write_all(content.as_bytes())?;
    }
    Ok(())
}
