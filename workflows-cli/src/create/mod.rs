use crate::CreateArgs;
use std::io;
use std::os::unix::fs as fs_sym;
use std::path::{Path, PathBuf};
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
    let root_path = Path::new(&args.name);
    println!("Generating Template Repo: {:?}", args.name);
    let new_dir = fs::create_dir(root_path);
    match new_dir {
        Ok(_) => println!("Created directory: {}", args.name),
        Err(e) => {
            let err = format!("Failed to create directory {}: {}", args.name, e);
            return Err(err);
        }
    }

    let conventional_dest = root_path.join("conventional-templates");
    let helm_dest = root_path.join("helm-based-templates");
    let workflow_home_path = Path::new(&args.workflows_home);
    let conventional_src = workflow_home_path.join("template-boilerplate/conventional-templates");
    let helm_src = workflow_home_path.join("template-boilerplate/helm-based-templates");

    if !args.manifest {
        if prompt_fn("Would you like to store conventional WorkflowTemplate manifests? (y/n)") {
            copy_directory(&conventional_src, &conventional_dest);
        }
    } else {
        copy_directory(&conventional_src, &conventional_dest);
    }

    if !args.helm {
        if prompt_fn("Would you like to store helm-based WorkflowTemplates? (y/n)") {
            copy_directory(&helm_src, &helm_dest);
        }
    } else {
        copy_directory(&helm_src, &helm_dest);
    }
    Ok(())
}

fn prompt(message: &str) -> bool {
    println!("{message}");
    let mut selection = String::new();

    loop {
        io::stdin()
            .read_line(&mut selection)
            .expect("Failed to read line");
        if selection.to_lowercase().trim() == "y" {
            return true;
        } else if selection.to_lowercase().trim() == "n" {
            return false;
        } else {
            println!("Invalid input. Please enter 'y' or 'n'.");
        }
    }
}

fn copy_directory(src: &PathBuf, dest: &PathBuf) {
    if let Err(e) = fs::create_dir_all(dest) {
        eprintln!(
            "Failed to create destination directory {}: {}",
            dest.display(),
            e
        );
        return;
    }
    if let Ok(entries) = fs::read_dir(src) {
        for entry in entries.flatten() {
            let src_path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if src_path.is_symlink() {
                if let Ok(link_target) = fs::read_link(&src_path) {
                    #[cfg(unix)]
                    if let Err(e) = fs_sym::symlink(&link_target, &dest_path) {
                        eprintln!("Failed to create symlink {}: {}", dest_path.display(), e);
                    }
                }
            } else if src_path.is_dir() {
                if let Err(e) = fs::create_dir_all(&dest_path) {
                    eprintln!("Failed to create directory {}: {}", dest_path.display(), e);
                    continue;
                }
                copy_directory(&src_path, &dest_path);
            } else if src_path.is_file()
                && let Err(e) = fs::copy(&src_path, &dest_path)
            {
                eprintln!("Failed to copy {}: {}", src_path.display(), e);
            }
        }
    } else {
        eprintln!("Failed to read source folder: {}", src.display());
    }
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
