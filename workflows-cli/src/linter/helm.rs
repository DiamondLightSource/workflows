#![allow(clippy::missing_docs_in_private_items)]

use std::fs;
use std::fs::{File, read_dir};
use std::io::Write;
use std::path::Path;

use crate::command_runner::get_command_factory;
use crate::linter::LintResult;
use crate::linter::base_linting::lint_from_manifest;

pub fn lint_from_helm(target: &Path, all: bool) -> Result<Vec<LintResult>, String> {
    // FIXME: does not respect $TMPDIR and potential race condition / permissions issue on multi-user systems
    let tmp_dir = Path::new("/tmp/argo-lint");

    // When --all is provided, we traverse up the file path to find the directory with the chart.yaml
    // in it. If a user passes 'templates/workflow.yaml', this will check only the templates dir,
    // and doesnt check '.' as this is not explicitly in the path which will cause the lint to fail
    // if lint is called from the same directory as the Chart.yaml.
    // Appending './' adds '.' to the path traversal, which makes sure the working directory is also
    // checked for Chart.yaml
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

    // See comment above regarding appending ./
    let chart_root = match all {
        true => target,
        false => target
            .ancestors()
            .find(|path| path.join("Chart.yaml").exists())
            .ok_or_else(|| "Could not find a parent directory containing Chart.yaml".to_string())?,
    };

    let manifests = fetch_all_helm_manifests(chart_root, select_template)?;

    if manifests.is_empty() {
        return Err(
            "Found no workflows/templates. Either specify the template in ./templates, or add the --all flag to check all"
                .to_string(),
        );
    }

    write_to_clean_folder(tmp_dir, manifests)
        .map_err(|_e| "Couldn't create temporary file for helm templates.")?;

    let path_buf = tmp_dir.to_path_buf();
    lint_from_manifest(&path_buf, true)
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

pub fn write_to_clean_folder(path: &Path, contents: Vec<String>) -> std::io::Result<()> {
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
        let file_path = path.join(format!("workflow_{i}.yaml"));
        let mut file = File::create(file_path)?;
        file.write_all(content.as_bytes())?;
    }
    Ok(())
}
