use serde_yaml::{self, Value};
use std::fs;
use std::path::Path;

use crate::SubmitArgs;
use crate::command_runner::get_command_factory;
use crate::helm_integration::{ManifestType, helm_to_manifest};

pub fn submit(args: SubmitArgs) {
    let result = match args.manifest_type {
        ManifestType::Manifest => submit_manifest(&args.file_path, &args.session),
        ManifestType::Helm => submit_helm(&args.file_path, &args.session),
    };

    if let Ok(workflow_name) = result {
        println!(
            "Submitted Workflow {} to https://workflows.diamond.ac.uk/workflows/{}/{}",
            workflow_name, args.session, workflow_name
        );
        std::process::exit(0);
    } else if let Err(e) = result {
        if e.contains("authentication error") {
            let msg = format!(
                "Authentication error, please run 'kubectl get workflows -n {}' to prompt a login, and try again.",
                args.session
            );
            eprintln!("{msg}");
        } else {
            let msg = format!("There was an error when trying to submit the workflow:\n{e}");
            eprintln!("{msg}");
        }
        std::process::exit(1);
    }
}

fn submit_helm(target: &Path, session: &str) -> Result<String, String> {
    let manifest = helm_to_manifest(target, false)?;

    if manifest.len() > 1 {
        let msg = format!(
            "Found more than one template in {}. Templates can only be tested one at a time.",
            target.display()
        );
        return Err(msg);
    }

    let raw_manifest = manifest.first().ok_or("No manifests returned")?;
    submit_from_str(raw_manifest, session)
}

fn submit_manifest(target: &Path, session: &str) -> Result<String, String> {
    let raw_manifest = read_manifest(target)?;
    submit_from_str(&raw_manifest, session)
}

fn submit_from_str(raw_manifest: &str, session: &str) -> Result<String, String> {
    let mut parsed: Value = serde_yaml::from_str(raw_manifest)
        .map_err(|e| format!("Could not parse the manifest {e}"))?;

    parsed
        .as_mapping_mut()
        .ok_or("Malformed manifest. Expected a dictionary.")?
        .insert("kind".into(), "Workflow".into());

    let metadata = parsed
        .get_mut("metadata")
        .ok_or("Could not find metadata tag in template")?;

    if let Value::Mapping(metadata) = metadata {
        let name = metadata
            .get("name")
            .ok_or("Could not find name of template")?;
        let mut formatted_name = name.as_str().unwrap().to_string();
        formatted_name.push('-');

        metadata.remove("name");
        metadata.insert("generateName".into(), formatted_name.into());
    };

    let yaml = serde_json::to_string(&parsed).unwrap();
    let command = get_command_factory()
        .new_command("argo")
        .arg("submit")
        .arg("-")
        .arg("-n")
        .arg(session)
        .output_with_stdin(&yaml.as_bytes());

    let response = command.map_err(|e| format!("Failed to run argo command: {e}"))?;

    if !response.status.success() {
        let error = String::from_utf8_lossy(&response.stderr);
        return Err(error.to_string());
    }

    let response = String::from_utf8(response.stdout)
        .map_err(|e| format!("Could not parse error response: {e}"))?;
    let name = response
        .lines()
        .next()
        .and_then(|line| line.split(":").nth(1))
        .map(|name| name.trim())
        .ok_or("Could not extract submitted workflow name")?;

    Ok(name.to_string())
}

fn read_manifest(target: &Path) -> Result<String, String> {
    if !(target.exists() && target.is_file()) {
        return Err(format!("Template at {} does not exist", target.display()));
    }
    fs::read_to_string(target).map_err(|e| format!("Failed to read file {e}"))
}

