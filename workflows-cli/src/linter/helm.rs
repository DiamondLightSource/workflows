#![allow(clippy::missing_docs_in_private_items)]

use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::Path;

use crate::helm_integration::helm_to_manifest;
use crate::linter::LintResult;
use crate::linter::base_linting::lint_from_manifest;

pub fn lint_from_helm(target: &Path, all: bool) -> Result<Vec<LintResult>, String> {
    // FIXME: does not respect $TMPDIR and potential race condition / permissions issue on multi-user systems
    let tmp_dir = Path::new("/tmp/argo-lint");
    let manifests = helm_to_manifest(target, all)?;
    write_to_clean_folder(tmp_dir, manifests)
        .map_err(|_e| "Couldn't create temporary file for helm templates.")?;

    let path_buf = tmp_dir.to_path_buf();
    lint_from_manifest(&path_buf, true)
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
