use std::env;
use std::io;
use std::process::{Command, Output};

#[cfg(unix)]
use std::os::unix::process::ExitStatusExt;

pub trait CommandLike {
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike;
    fn output(&mut self) -> io::Result<Output>;
}

pub struct RealCommand {
    cmd: Command,
}

impl CommandLike for RealCommand {
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike {
        self.cmd.arg(arg);
        self
    }

    fn output(&mut self) -> io::Result<Output> {
        self.cmd.output()
    }
}

pub trait CommandFactory {
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike>;
}

pub struct RealCommandFactory;

impl CommandFactory for RealCommandFactory {
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike> {
        Box::new(RealCommand {
            cmd: Command::new(cmd),
        })
    }
}

pub struct MockCommand {
    cmd: String,
    args: Vec<String>,
    output: Output,
}

impl MockCommand {
    pub fn new(cmd: &str, fake_stdout: &str) -> Self {
        Self {
            cmd: cmd.to_string(),
            args: vec![],
            output: Output {
                status: std::process::ExitStatus::from_raw(0),
                stdout: fake_stdout.as_bytes().to_vec(),
                stderr: vec![],
            },
        }
    }
}

impl CommandLike for MockCommand {
    fn arg(&mut self, arg: &str) -> &mut dyn CommandLike {
        self.args.push(arg.to_string());
        self
    }

    fn output(&mut self) -> io::Result<Output> {
        println!(
            "[MockCommand] Simulated command: {} {}",
            self.cmd,
            self.args.join(" ")
        );
        Ok(self.output.clone())
    }
}

pub struct MockCommandFactory;

impl CommandFactory for MockCommandFactory {
    fn new_command(&self, cmd: &str) -> Box<dyn CommandLike> {
        Box::new(MockCommand::new(cmd, "Mocked output"))
    }
}

pub fn get_command_factory() -> Box<dyn CommandFactory> {
    match env::var("MOCK_COMMAND") {
        Ok(val) if val == "1" => Box::new(MockCommandFactory),
        _ => Box::new(RealCommandFactory),
    }
}

fn main() {
    let mut command = get_command_factory().new_command("ls");
    command.arg("-al");

    match command.output() {
        Ok(output) => println!("Output:\n{}", String::from_utf8_lossy(&output.stdout)),
        Err(e) => eprintln!("Error executing command: {}", e),
    }
}
