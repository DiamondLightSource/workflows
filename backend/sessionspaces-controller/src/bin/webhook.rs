#[tokio::main]
async fn main() -> anyhow::Result<()> {
    sessionspaces_controller::webhook::run().await
}
