#![allow(clippy::missing_docs_in_private_items)]

use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::Path;

use crate::helm_integration::helm_to_manifest;
use crate::linter::base_linting::lint_from_manifest;
use crate::linter::LintResult;

/// Function type used to convert a Helm chart into rendered manifests.
///
/// This indirection allows unit tests to inject a fake Helm implementation
/// and avoids requiring the `helm` binary to be installed when running tests.
pub type HelmToManifestFn =
    fn(&Path, bool) -> Result<Vec<String>, String>;

/// Production entry point.
///
/// This preserves the original public API and uses the real Helm integration.
pub fn lint_from_helm(
    target: &Path,
    all: bool,
) -> Result<Vec<LintResult>, String> {
    lint_from_helm_with(target, all, helm_to_manifest)
}

/// Testable implementation that allows the Helm rendering logic to be injected.
///
/// In production, this is called with `helm_to_manifest`.
/// In tests, a fake implementation can be supplied.
pub fn lint_from_helm_with(
    target: &Path,
    all: bool,
    helm_fn: HelmToManifestFn,
) -> Result<Vec<LintResult>, String> {
    // NOTE:
    // This mirrors the existing behavior. A future improvement would be
    // to use a tempdir crate instead of a fixed /tmp path.
    let tmp_dir = Path::new("/tmp/argo-lint");

    let manifests = helm_fn(target, all)?;

    write_to_clean_folder(tmp_dir, manifests)
        .map_err(|_e| "Couldn't create temporary file for helm templates.")?;

    lint_from_manifest(tmp_dir, true)
}

/// Writes rendered manifests into a directory, removing any existing content.
///
/// This is shared by both production and test execution paths.
pub fn write_to_clean_folder(
    path: &Path,
    contents: Vec<String>,
) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }

    // Clean the directory first
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();

        if entry_path.is_file() {
            fs::remove_file(entry_path)?;
        } else if entry_path.is_dir() {
            fs::remove_dir_all(entry_path)?;
        }
    }

    // Write manifests as sequential YAML files
    for (i, content) in contents.iter().enumerate() {
        let file_path = path.join(format!("workflow_{i}.yaml"));
        let mut file = File::create(file_path)?;
        file.write_all(content.as_bytes())?;
    }

    Ok(())
}
