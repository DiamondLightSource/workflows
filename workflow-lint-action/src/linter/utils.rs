use std::process;

/// Exit with helpful debug rather than panicking
pub fn clean_exit<T>(message: &str) -> T {
    eprintln!("{}", message);
    process::exit(1);
}
