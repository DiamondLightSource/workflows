#![forbid(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::missing_docs_in_private_items)]
#![doc = include_str!("../README.md")]

/// ISPyB permissionables tables
mod permissionables;
/// Kubernetes resource templating
mod resources;

fn main() {
    println!("Hello, world!");
}
