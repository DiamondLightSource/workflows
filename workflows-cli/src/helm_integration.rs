use std::{fs::read_dir, path::Path};

use clap::ValueEnum;

use crate::command_runner::get_command_factory;

/// Supported manifest
#[derive(Debug, Clone, ValueEnum)]
#[clap(rename_all = "lower")]
pub enum ManifestType {
    Manifest,
    Helm,
}

pub fn helm_to_manifest(target: &Path, all: bool) -> Result<Vec<String>, String> {
    let target = match target.is_absolute() {
        true => target,
        false => &Path::new("./").join(target),
    };

    let select_template = match all {
        true => None,
        false => {
            if let Some(file_name) = target.file_name() {
                Some(file_name.to_str().unwrap())
            } else {
                return Err(format!(
                    "{} is a directory. Please use the --all flag.",
                    target.display()
                ));
            }
        }
    };

    let chart_root = match all {
        true => target,
        false => target
            .ancestors()
            .find(|path| path.join("Chart.yaml").exists())
            .ok_or_else(|| "Could not find a parent directory containing Chart.yaml".to_string())?,
    };

    let manifests = fetch_all_helm_manifests(chart_root, select_template)?;

    if manifests.is_empty() {
        if all {
            let msg = format!("Found no workflows in {}", target.display());
            return Err(msg);
        } else {
            let msg = format!("{} is not a valid workflow/template", target.display());
            return Err(msg);
        }
    }
    Ok(manifests)
}

pub fn fetch_all_helm_manifests(
    target: &Path,
    template: Option<&str>,
) -> Result<Vec<String>, String> {
    let mut files = read_dir(target).map_err(|_e| {
        format!(
            "Failed to build helm templates. Does {} contain chart.yaml?",
            target.display()
        )
    })?;

    let has_chart = files.any(|f| {
        f.ok()
            .and_then(|entry| entry.file_name().to_str().map(|name| name == "Chart.yaml"))
            .unwrap_or(false)
    });

    if !has_chart {
        return Err(format!(
            "Could not find 'Chart.yaml' in {} ",
            target.display()
        ));
    }

    let manifests = helm_template(target, template)?;
    Ok(manifests)
}

pub fn helm_template(target: &Path, template: Option<&str>) -> Result<Vec<String>, String> {
    let mut base_command = get_command_factory().new_command("helm");
    base_command.arg("template").arg(target.to_str().unwrap());

    if let Some(template) = template {
        let target_template = Path::new("templates").join(template);
        base_command
            .arg("-s")
            .arg(target_template.to_str().unwrap());
    }

    let output = base_command
        .output()
        .map_err(|_e| "Failed to run 'helm'. Is it installed?")?;

    Ok(String::from_utf8_lossy(&output.stdout)
        .split("---")
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .collect())
}
