use clap::Parser;
use clap::arg;
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Parser, Clone, Serialize, Deserialize)]
pub struct Config {
    #[arg(
        short = 'i',
        long,
        env = "WORKFLOWS_OIDC_BFF_CLIENT_ID",
        // default_value = "workflows-dashboard"
        default_value = "workflows-ui-dev"
    )]
    pub client_id: String,
    #[arg(
        short = 's',
        long,
        env = "WORKFLOWS_OIDC_BFF_CLIENT_SECRET",
        default_value = ""
    )]
    pub client_secret: String,
    #[arg(
        short = 'u',
        long,
        default_value = "https://authn.diamond.ac.uk/realms/master"
    )]
    pub oidc_provider_url: String,
    #[arg(
        short = 'p',
        long,
        env = "WORKFLOWS_OIDC_BFF_PORT",
        default_value = "5173"
    )]
    pub port: u16,
}
