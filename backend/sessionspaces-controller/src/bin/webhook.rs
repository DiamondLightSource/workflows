#[tokio::main]
async fn main() {
    sessionspaces_controller::webhook::run().await;
}
