use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use sodiumoxide::crypto::box_::gen_keypair;

fn main() {
    // Initialize sodiumoxide (required before using crypto functions)
    if sodiumoxide::init().is_err() {
        eprintln!("Failed to initialize libsodium");
        std::process::exit(1);
    }

    // Generate a new sealed-box keypair
    let (public_key, secret_key) = gen_keypair();

    // Base64 encode for easy storage in environment variables
    let public_b64 = BASE64.encode(public_key.0);
    let secret_b64 = BASE64.encode(secret_key.0);

    println!("Public Key:");
    println!("{}", public_b64);
    println!();
    println!("Private Key:");
    println!("{}", secret_b64);
}
