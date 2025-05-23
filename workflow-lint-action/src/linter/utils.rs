use std::process;

/// Exit with debug rather than panicking
pub fn clean_exit<T>(message: &str) -> T {
    println!("{}", message);
    process::exit(1);
}
