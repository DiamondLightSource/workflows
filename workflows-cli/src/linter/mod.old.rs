/// General Utilities
mod utils;
use std::ops::Deref;
use std::path::Path;
use utils::clean_exit;

use crate::LintArgs;
use colored::*;
use std::process::Command;
use std::{fs, path::PathBuf};
use yaml_rust2::YamlLoader;


#[derive(Debug, Clone)]
pub enum ManifestType {
    MANIFEST,
    HELM,
}

/// Linter processing for workflows
pub fn lint(args: LintArgs) {
    println!("{}", "-------------------------------".blue());
    println!("{}", "-------- STARTING LINTER ------".blue().bold());
    println!("{}", "-------------------------------".blue());

    println!(
        "{} {}",
        "[INFO] Using config file:".blue(),
        config_path.display()
    );

    let config_str = fs::read_to_string(&config_path).unwrap_or_else(|err| {
        clean_exit(&format!(
            "{}",
            format!("[ERROR] Failed to read config file: {}", err).red()
        ))
    });

    let configs = YamlLoader::load_from_str(&config_str).unwrap_or_else(|err| {
        clean_exit(&format!(
            "{}",
            format!("[ERROR] Invalid YAML syntax: {}", err).red()
        ))
    });

    let config = configs
        .first()
        .unwrap_or_else(|| clean_exit(&format!("{}", "[ERROR] Config file is empty.".red())));

    let mut manifest_errors = match config["manifests"].as_vec() {
        Some(manifest_paths) => {
            println!(
                "{} {}",
                "[INFO] Found manifests/folders to lint:".blue(),
                manifest_paths.len()
            );
            let manifest_names = manifest_paths
                .iter()
                .map(|yaml| yaml.as_str().unwrap())
                .collect();
            conventional_manifests(&args.base_path, manifest_names)
        }
        None => {
            println!(
                "{}",
                "[WARN] No manifests defined in config... Skipping linting.".yellow()
            );
            Vec::new()
        }
    };

    let helm_errors = match config["helmManifests"].as_vec() {
        Some(manifest_paths) => {
            println!("----------------------------------------------");
            println!(
                "{} {}",
                "[INFO] Found helm chart to lint:".blue(),
                manifest_paths.len()
            );
            let manifest_names: Vec<&str> = manifest_paths
                .iter()
                .map(|yaml| yaml.as_str().unwrap())
                .collect();
            helm_manifests(&args.base_path, manifest_names)
        }
        None => {
            println!(
                "{}",
                "[WARN] No manifests defined in config... Skipping linting.".yellow()
            );
            Vec::new()
        }
    };
    manifest_errors.extend(helm_errors.iter().cloned());

    if !manifest_errors.is_empty() {
        println!(
            "\n{}",
            "[ERROR] Linting completed with issues:".red().bold()
        );
        for error in manifest_errors {
            println!("  {} {}", "•".red(), error);
        }
        clean_exit(&format!(
            "{}",
            "[FAIL] Linting failed due to errors.".red().bold()
        ))
    } else {
        println!(
            "\n{}",
            "[SUCCESS] All manifests linted successfully. No issues found."
                .green()
                .bold()
        );
    }
}

/// Run the linter against conventional, non-helm-based workflows
fn conventional_manifests(base_path: &Path, manifests: Vec<&str>) -> Vec<String> {
    println!("{}", "[INFO] Beginning linting for each manifest...".blue());

    manifests.iter().for_each(|manifest| {
        println!("  {} {}", "→".cyan(), manifest.cyan());
    });

    let abs_manifest_paths: Vec<PathBuf> = manifests
        .iter()
        .map(|manifest| base_path.join(manifest))
        .collect();

    let mut errors = Vec::new();

    for manifest_path in &abs_manifest_paths {
        println!(
            "{} {}",
            "[INFO] Running `argo lint` on:".blue(),
            manifest_path.display()
        );

        let output = Command::new("argo")
            .arg("lint")
            .arg(manifest_path)
            .arg("--offline")
            .arg("--output")
            .arg("simple")
            .output()
            .unwrap_or_else(|err| {
                clean_exit(&format!(
                    "{}",
                    format!(
                        "[ERROR] Failed to execute `argo lint` on {}: {}",
                        manifest_path.display(),
                        err
                    )
                    .red()
                ))
            });

        if output.status.success() {
            println!("  {} {}", "[PASS]".green(), manifest_path.display());
        } else {
            let err_msg = String::from_utf8_lossy(&output.stdout);
            let sub_errors: Vec<String> = err_msg
                .lines()
                .filter(|msg| {
                    if msg.contains("couldn't find cluster workflow template") {
                        println!(
                            "  {} External template reference skipped:",
                            "[WARN]".yellow(),
                        );
                        println!("     {}", msg.yellow());
                        false
                    } else {
                        true
                    }
                })
                .map(str::to_owned)
                .collect();

            if !sub_errors.is_empty() {
                println!("  {} {}", "[FAIL]".red(), manifest_path.display());
                errors.extend(sub_errors);
            }
        }
    }

    errors
}

/// Lint helm-style workflows
fn helm_manifests(base_path: &Path, manifests: Vec<&str>) -> Vec<String> {
    println!(
        "{}",
        "[INFO] Beginning linting for helm manifests...".blue()
    );
    let dir_path = Path::new("/tmp/argo-lint");

    manifests.iter().for_each(|manifest| {
        println!("  {} {}", "→".cyan(), manifest.cyan());
    });

    let abs_manifest_paths: Vec<PathBuf> = manifests
        .iter()
        .map(|manifest| base_path.join(manifest))
        .collect();

    let mut results = Vec::new();
    for manifest_path in &abs_manifest_paths {
        println!(
            "{} {}",
            "[INFO] Templating helm charts at:".blue(),
            manifest_path.display()
        );

        if Command::new("which")
            .arg("helm")
            .output()
            .map(|o| !o.status.success())
            .unwrap_or(true)
        {
            clean_exit(&format!("{}", "[ERROR] `helm` not found in PATH.".red()))
        }
        let output = Command::new("helm")
            .arg("template")
            .arg(manifest_path)
            .output()
            .unwrap_or_else(|err| {
                clean_exit(&format!(
                    "{}",
                    format!(
                        "[ERROR] Failed to execute `helm template` on {}: {}",
                        manifest_path.display(),
                        err
                    )
                    .red()
                ))
            });
        if !output.status.success() {
            clean_exit(&format!(
                "Something went wrong when running `helm template`\n{}",
                String::from_utf8(output.stderr).unwrap()
            ))
        }

        let utf8_string = String::from_utf8(output.stdout).unwrap();
        let split_manifests: Vec<&str> =
            utf8_string.split("---").filter(|s| !s.is_empty()).collect();
        if !fs::exists(dir_path).unwrap() {
            fs::create_dir(dir_path).unwrap()
        }

        let output_manifests: Vec<String> = split_manifests
            .iter()
            .enumerate()
            .map(|(i, template_content)| {
                let file_path = format!("{}/template_{}.yaml", dir_path.display(), i);
                fs::write(&file_path, template_content).unwrap();
                file_path
            })
            .collect();
        println!("Helm template created {} manifests.", {
            output_manifests.len()
        });
        let borrowed_manifest = output_manifests.iter().map(|file| file.deref()).collect();

        let resp = conventional_manifests(Path::new("/"), borrowed_manifest);

        for entry in fs::read_dir(dir_path).unwrap() {
            let path = entry.unwrap().path();
            if path.is_file() {
                let _ = fs::remove_file(path);
            }
        }

        results.extend(resp);
    }
    results
}
