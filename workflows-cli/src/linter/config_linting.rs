#![allow(clippy::missing_docs_in_private_items)]
use serde::Deserialize;
use std::{
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
};

use crate::linter::{base_linting::lint_from_manifest, helm::lint_from_helm, print_and_exit};

#[derive(Debug, Deserialize)]
struct Config {
    manifests: Option<Vec<PathBuf>>,
    charts: Option<Vec<PathBuf>>,
}

pub fn lint_from_config(config_path: &Path) {
    let config = parse_config(config_path).unwrap_or_else(|e| {
        eprintln!(
            "Could not open config file {}: {}",
            config_path.display(),
            e
        );
        std::process::exit(1);
    });

    let mut lint_results = Vec::new();

    if let Some(manifests) = config.manifests {
        for manifest in &manifests {
            match lint_from_manifest(manifest, true) {
                Ok(mut results) => lint_results.append(&mut results),
                Err(e) => {
                    eprintln!("Error linting manifest '{}': {}", manifest.display(), e);
                    std::process::exit(1);
                }
            }
        }
    }

    if let Some(charts) = config.charts {
        for chart in &charts {
            match lint_from_helm(chart, true) {
                Ok(mut results) => lint_results.append(&mut results),
                Err(e) => {
                    eprintln!("Error linting chart '{}': {}", chart.display(), e);
                    std::process::exit(1);
                }
            }
        }
    }

    print_and_exit(lint_results);
}

fn parse_config(path: &Path) -> Result<Config, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);

    Ok(serde_yaml::from_reader(reader)?)
}
