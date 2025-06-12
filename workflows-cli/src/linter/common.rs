use crate::command_runner::{CommandFactory, get_command_factory};

use super::LintResult;
use std::fs::read_to_string;
use std::path::PathBuf;

use yaml_rust2::YamlLoader;

pub fn lint_path(target: &PathBuf) -> Result<LintResult, String> {
    let template_name = get_template_name(target)?;
    let result = lint_template(target)?;
    Ok(LintResult::new(template_name, result))
}

pub fn get_yaml(target: &PathBuf) -> Result<String, String> {
    read_to_string(target)
        .map_err(|err| format!("Couldn't read file {}: {}", target.display(), err))
}

pub fn get_template_name(path: &PathBuf) -> Result<String, String> {
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

pub fn lint_template(target: &PathBuf) -> Result<Vec<String>, String> {
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

    let errs = String::from_utf8_lossy(&command.stdout)
        .lines()
        .filter(|msg| !msg.contains("couldn't find cluster workflow template"))
        .filter(|msg| !msg.contains("no linting errors"))
        .map(|msg| {
            if let Some((_, remainder)) = msg.split_once(":") {
                remainder.trim_start()
            } else {
                msg
            }
        })
        .map(str::to_string)
        .collect();
    Ok(errs)
}
