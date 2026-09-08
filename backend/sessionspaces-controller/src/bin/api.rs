/// Starts the SessionSpaces preparation API server.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    sessionspaces_controller::api::run().await
}
