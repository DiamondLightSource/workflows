use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io;
use std::os::unix::process::ExitStatusExt;
use std::process::{Command, Output};

/// Underlying traits used to run/mock CLI commands
pub trait CommandLike {
    /// Command arguments
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike;
    /// Execute command
    fn output(&mut self) -> io::Result<Output>;
}

/// Real command runner
pub struct RealCommand {
    /// Command instance
    cmd: Command,
}

/// Add arg and ouput methods to Realcommand
impl CommandLike for RealCommand {
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike {
        self.cmd.arg(arg);
        self
    }

    fn output(&mut self) -> io::Result<Output> {
        self.cmd.output()
    }
}

/// Shared 'new' command trait between real and mock runners
pub trait CommandFactory {
    /// Returns a CommandLike runner
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike>;
}

/// Return a real command runner
pub struct RealCommandFactory;

/// Heap allocated command to assign command runner at run-time
impl CommandFactory for RealCommandFactory {
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike> {
        Box::new(RealCommand {
            cmd: Command::new(cmd),
        })
    }
}

/// Structure of mock entry as in mapping file
#[derive(Debug, Deserialize, Default, Clone)]
struct MockEntry {
    /// Calling command
    command: String,
    /// CLI return
    response: String,
    /// Exit code
    code: i32,
}

/// Required fields to mock real command
pub struct MockCommand {
    /// Command being used
    cmd: String,
    /// CLI arguents
    args: Vec<String>,
    /// Map CLI call to output
    mappings: Vec<MockEntry>,
}

impl MockCommand {
    /// Initiate mock command runner
    pub fn new(cmd: &str) -> Self {
        let yaml_str = fs::read_to_string("./tests/mock_commands.yaml")
            .expect("Failed to read mock_commands.yaml");

        let mappings: HashMap<String, Vec<MockEntry>> =
            serde_yaml::from_str(&yaml_str).expect("Failed to parse YAML");

        let target_mapping = env::var("WORKFLOW_CLI_TEST_ACTIVE_MAPPING").unwrap();
        let active_mapping = mappings.get(&target_mapping).unwrap();

        Self {
            cmd: cmd.to_string(),
            args: vec![],
            mappings: active_mapping.clone(),
        }
    }

    /// Lookup command in the mapping table
    fn get_response(&self) -> (String, i32) {
        let full_command = format!("{} {}", self.cmd, self.args.join(" "));
        println!("MOCK COMMAND: {}", full_command);
        let entry = self
            .mappings
            .iter()
            .find(|entry| entry.command == full_command)
            .unwrap();
        (entry.response.clone(), entry.code)
    }
}

impl CommandLike for MockCommand {
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike {
        self.args.push(arg.to_string());
        self
    }

    fn output(&mut self) -> io::Result<Output> {
        let response = self.get_response();
        println!(
            "[MockCommand] Simulated command: {} {}",
            self.cmd,
            self.args.join(" ")
        );

        Ok(Output {
            status: std::process::ExitStatus::from_raw(response.1),
            stdout: response.0.as_bytes().to_vec(),
            stderr: vec![],
        })
    }
}

/// Mock factory used to run argo/helm in tests
pub struct MockCommandFactory;

/// New command trait fo the mock factory
impl CommandFactory for MockCommandFactory {
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike> {
        Box::new(MockCommand::new(cmd))
    }
}

/// Get an instance of the CLI builder
pub fn get_command_factory() -> Box<dyn CommandFactory> {
    match env::var("WORKFLOWS_CLI_TEST_ENABLE_MOCK_COMMAND") {
        Ok(val) if val == "1" => Box::new(MockCommandFactory),
        _ => Box::new(RealCommandFactory),
    }
}
