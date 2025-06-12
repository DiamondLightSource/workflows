use std::fs;
use std::fs::{File, read_dir};
use std::io::Write;
use std::path::Path;

use crate::command_runner::get_command_factory;

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
        .map_err(|e| "Failed to run 'helm'. Is it installed?")?;

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
    let mut files = read_dir(target).map_err(|e| {
        format!(
            "Failed to build helm templates. Does {} have chart.yaml in it?",
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
        let file_path = path.join(format!("workflow_{}.yaml", i));
        let mut file = File::create(file_path)?;
        file.write_all(content.as_bytes())?;
    }
    Ok(())
}
