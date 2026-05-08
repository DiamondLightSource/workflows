use crate::CreateArgs;
use std::io;
use std::os::unix::fs as fs_sym;
use std::path::Path;
use std::{fs, process};

pub fn create(args: CreateArgs) {
    let result = generate_template_repo(&args, prompt);

    match result {
        Ok(()) => {
            println!("Template Repo Created Successfully")
        }
        Err(e) => {
            println!("Failed to create directory {}: {}", args.name, e);
            process::exit(1);
        }
    };
}

fn generate_template_repo(args: &CreateArgs, prompt_fn: fn(&str) -> bool) -> Result<(), String> {
    //  Reject workflow files
    if args.name.ends_with(".yaml") || args.name.ends_with(".yml") {
        return Err(format!(
            "Invalid name '{}': create expects a directory name, not a workflow file",
            args.name
        ));
    }

    let root_path = Path::new(&args.name);
    println!("Generating Template Repo: {}", root_path.display());

    fs::create_dir(root_path)
        .map_err(|e| format!("Failed to create directory {}: {}", root_path.display(), e))?;

    println!("Created directory: {}", root_path.display());

    let workflows_home = Path::new(&args.workflows_home);

    let conventional_src = workflows_home.join("template-boilerplate/conventional-templates");
    let helm_src = workflows_home.join("template-boilerplate/helm-based-templates");

    //  Validate sources BEFORE asking user anything
    if !conventional_src.exists() {
        return Err(format!(
            "Missing conventional template source directory: {}",
            conventional_src.display()
        ));
    }
    if !helm_src.exists() {
        return Err(format!(
            "Missing helm template source directory: {}",
            helm_src.display()
        ));
    }

    let conventional_dest = root_path.join("conventional-templates");
    let helm_dest = root_path.join("helm-based-templates");

    let include_conventional = if args.manifest {
        true
    } else {
        prompt_fn("Would you like to store conventional WorkflowTemplate manifests? (y/n)")
    };

    if include_conventional {
        copy_directory(&conventional_src, &conventional_dest)?;
        println!("Copied conventional templates");
    }

    let include_helm = if args.helm {
        true
    } else {
        prompt_fn("Would you like to store helm-based WorkflowTemplates? (y/n)")
    };

    if include_helm {
        copy_directory(&helm_src, &helm_dest)?;
        println!("Copied helm templates");
    }

    Ok(())
}

fn prompt(message: &str) -> bool {
    println!("{message}");
    let mut selection = String::new();

    loop {
        selection.clear();

        io::stdin()
            .read_line(&mut selection)
            .expect("Failed to read line");

        match selection.trim().to_lowercase().as_str() {
            "y" => return true,
            "n" => return false,
            _ => println!("Invalid input. Please enter 'y' or 'n'."),
        }
    }
}



// Recursively copy directory contents
fn copy_directory(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| {
        format!(
            "Failed to create destination directory {}: {}",
            dest.display(),
            e
        )
    })?;

    for entry in fs::read_dir(src).map_err(|e| {
        format!(
            "Failed to read source folder {}: {}",
            src.display(),
            e
        )
    })? {
        let entry = entry.map_err(|e| e.to_string())?;

        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());

        let metadata = fs::symlink_metadata(&src_path).map_err(|e| {
            format!(
                "Failed to read metadata for {}: {}",
                src_path.display(),
                e
            )
        })?;

        //SYMLINK
        if metadata.file_type().is_symlink() {
            let target = fs::read_link(&src_path).map_err(|e| {
                format!(
                    "Failed to read symlink {}: {}",
                    src_path.display(),
                    e
                )
            })?;

            fs_sym::symlink(&target, &dest_path).map_err(|e| {
                format!(
                    "Failed to create symlink {}: {}",
                    dest_path.display(),
                    e
                )
            })?;
        }
        //DIRECTORY
        else if metadata.is_dir() {
            copy_directory(&src_path, &dest_path)?;
        }
        // FILE
        else if metadata.is_file() {
            fs::copy(&src_path, &dest_path).map_err(|e| {
                format!(
                    "Failed to copy file {} -> {}: {}",
                    src_path.display(),
                    dest_path.display(),
                    e
                )
            })?;
        }
    }

    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use ::serial_test::serial;
    struct TestCleanup {
        directory: String,
    }

    impl TestCleanup {
        fn new(dir: &str) -> Self {
            Self {
                directory: dir.to_string(),
            }
        }
    }

    impl Drop for TestCleanup {
        fn drop(&mut self) {
            println!("Cleaning Directory: {}", self.directory);
            if let Err(e) = fs::remove_dir_all(&self.directory) {
                eprintln!("Failed to cleanup {}: {}", self.directory, e);
            }
        }
    }

    #[test]
    #[serial]
    fn test_prompt_yes() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: false,
            helm: false,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, true_prompt);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(conventional_file.exists());
        assert!(helm_base_file.exists());
        assert!(helm_data_file.exists());

        let conventional_content = fs::read_to_string(conventional_file)
            .expect("Cannot find conventional template folder");
        assert_eq!(conventional_content, "hello: world\n");

        let helm_base_content =
            fs::read_to_string(helm_base_file).expect("Cannot find helm base folder");
        assert_eq!(helm_base_content, "version: 2\n");

        let helm_data_content =
            fs::read_to_string(helm_data_file).expect("Cannot find helm data folder");
        assert_eq!(helm_data_content, "Hello World from a helm chart!\n");
    }

    #[test]
    #[serial]
    fn test_prompt_no() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: false,
            helm: false,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, false_prompt);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(!conventional_file.exists());
        assert!(!helm_base_file.exists());
        assert!(!helm_data_file.exists());
    }

    #[test]
    #[serial]
    fn test_prompt_helm() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: false,
            helm: false,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, true_prompt_helm);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(!conventional_file.exists());
        assert!(helm_base_file.exists());
        assert!(helm_data_file.exists());

        let helm_base_content =
            fs::read_to_string(helm_base_file).expect("Cannot find helm base folder");
        assert_eq!(helm_base_content, "version: 2\n");

        let helm_data_content =
            fs::read_to_string(helm_data_file).expect("Cannot find helm data folder");
        assert_eq!(helm_data_content, "Hello World from a helm chart!\n");
    }

    #[test]
    #[serial]
    fn test_prompt_manifest() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: false,
            helm: false,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, true_prompt_manifest);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(conventional_file.exists());
        assert!(!helm_base_file.exists());
        assert!(!helm_data_file.exists());

        let conventional_content = fs::read_to_string(conventional_file)
            .expect("Cannot find conventional template folder");
        assert_eq!(conventional_content, "hello: world\n");
    }

    #[test]
    #[serial]
    fn test_flags_manifest() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: true,
            helm: false,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, false_prompt);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(conventional_file.exists());
        assert!(!helm_base_file.exists());
        assert!(!helm_data_file.exists());

        let conventional_content = fs::read_to_string(conventional_file)
            .expect("Cannot find conventional template folder");
        assert_eq!(conventional_content, "hello: world\n");
    }

    #[test]
    #[serial]
    fn test_flags_helm() {
        let args = CreateArgs {
            name: ("test-folder").to_string(),
            manifest: false,
            helm: true,
            workflows_home: "./tests".to_string(),
        };

        let _cleanup = TestCleanup::new(&args.name);
        let _generate = generate_template_repo(&args, false_prompt);

        let conventional_file = Path::new("test-folder/conventional-templates/hello-world.yaml");
        let helm_base_file = Path::new("test-folder/helm-based-templates/test.yaml");
        let helm_data_file = Path::new("test-folder/helm-based-templates/data/hello.txt");

        assert!(!conventional_file.exists());
        assert!(helm_base_file.exists());
        assert!(helm_data_file.exists());

        let helm_base_content =
            fs::read_to_string(helm_base_file).expect("Cannot find helm base folder");
        assert_eq!(helm_base_content, "version: 2\n");

        let helm_data_content =
            fs::read_to_string(helm_data_file).expect("Cannot find helm data folder");
        assert_eq!(helm_data_content, "Hello World from a helm chart!\n");
    }

    fn true_prompt_manifest(message: &str) -> bool {
        if message == "Would you like to store conventional WorkflowTemplate manifests? (y/n)" {
            println!("{message}");
            return true;
        }
        false
    }

    fn true_prompt_helm(message: &str) -> bool {
        if message == "Would you like to store helm-based WorkflowTemplates? (y/n)" {
            println!("{message}");
            return true;
        }
        false
    }

    fn true_prompt(message: &str) -> bool {
        println!("{message}");
        true
    }

    fn false_prompt(message: &str) -> bool {
        println!("{message}");
        false
    }
}
