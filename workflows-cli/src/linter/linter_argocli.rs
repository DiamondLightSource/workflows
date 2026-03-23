use std::path::Path;

use crate::{command_runner::get_command_factory, linter::base_linting::Linter};

pub struct ArgoCLI;
impl Linter for ArgoCLI {
    fn lint(target: &Path) -> Result<Vec<String>, String> {
        let file_path = target.to_str().unwrap();
        let command = get_command_factory()
            .new_command("argo")
            .arg("lint")
            .arg(file_path)
            .arg("--offline")
            .arg("--output")
            .arg("simple")
            .output()
            .map_err(|e| format!("Failed to run Argo CLI: {e}"))?;

        let stdout = String::from_utf8_lossy(&command.stdout);
        let stderr = String::from_utf8_lossy(&command.stderr);
        let combined = format!("{stdout}\n{stderr}");

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
}
