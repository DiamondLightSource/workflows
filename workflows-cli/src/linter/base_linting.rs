#![allow(clippy::missing_docs_in_private_items)]
use yaml_rust2::YamlLoader;

use crate::command_runner::get_command_factory;

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

fn get_yaml(target: &Path) -> Result<String, String> {
    read_to_string(target)
        .map_err(|err| format!("Couldn't read file {}: {}", target.display(), err))
}

fn get_template_name(path: &Path) -> Result<String, String> {
    let yaml = get_yaml(path)?;
    let docs = YamlLoader::load_from_str(&yaml)
        .map_err(|e| format!("Manifest is not valid YAML: {}", e))?;

    let doc = docs.first().ok_or("YAML document is empty")?;

    let name = doc["metadata"]["name"]
        .as_str()
        .or_else(|| doc["metadata"]["generateName"].as_str())
        .ok_or("Template has no name")?
        .to_string();
    Ok(name)
}

fn lint_template(target: &Path) -> Result<Vec<String>, String> {
    let file_path = target.to_str().unwrap();
    let command = get_command_factory()
        .new_command("argo")
        .arg("lint")
        .arg(file_path)
        .arg("--offline")
        .arg("--output")
        .arg("simple")
        .output()
        .map_err(|e| format!("Failed to run Argo CLI: {}", e))?;

    let stdout = String::from_utf8_lossy(&command.stdout);
    let stderr = String::from_utf8_lossy(&command.stderr);
    let combined = format!("{}\n{}", stdout, stderr);

    let errs = combined
        .lines()
        .filter(|msg| !msg.is_empty())
        .filter(|msg| !msg.contains("couldn't find cluster workflow template"))
        .filter(|msg| !msg.contains("no linting errors"))
        .map(|msg| {
            if let Some((_, remainder)) = msg.split_once("msg=failed to parse YAML from file") {
                remainder.trim_start()
            } else {
                msg
            }
        })
        .map(|msg| {
            if let Some((_, remainder)) = msg.split_once(":") {
                remainder.trim_start()
            } else {
                msg
            }
        })
        .map(|msg| msg.replace('"', ""))
        .collect();
    Ok(errs)
}
