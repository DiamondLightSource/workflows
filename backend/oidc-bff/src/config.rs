use clap::Parser;
use clap::arg;

#[derive(Debug, Parser, Clone)]
pub struct Config {
    #[arg(short, long, env = "WORKFLOWS_OIDC_BFF_CLIENT_ID")]
    pub client_id: String,
    #[arg(short, long, env = "WORKFLOWS_OIDC_BFF_CLIENT_SECRET")]
    pub client_secret: String,
    #[arg(
        short,
        long,
        default_value = "https://authn.diamond.ac.uk/realms/master/"
    )]
    pub oidc_provider_url: String,
}
