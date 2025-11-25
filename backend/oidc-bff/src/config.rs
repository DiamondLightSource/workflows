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
    #[arg(long, env = "WORKFLOWS_OIDC_POSTGRES_USER", default_value = "postgres")]
    pub postgres_user: String,
    #[arg(
        long,
        env = "WORKFLOWS_OIDC_POSTGRES_PASSWORD",
        default_value = "postgres"
    )]
    pub postgres_password: String,
    #[arg(
        long,
        env = "WORKFLOWS_OIDC_POSTGRES_DATABASE",
        default_value = "postgres"
    )]
    pub postgres_database: String,
    #[arg(
        long,
        env = "WORKFLOWS_OIDC_POSTGRES_HOSTNAME",
        default_value = "localhost"
    )]
    pub postgres_hostname: String,
    #[arg(long, env = "WORKFLOWS_OIDC_POSTGRES_PORT", default_value = "5432")]
    pub postgres_port: u16,
    #[arg(
        long,
        env = "WORKFLOWS_OIDC_ENCRYPTION_PUBLIC_KEY",
        default_value = "/8MLLEwz7CkTkUv9y1pq6Gcv2Aomlhpq7shhv95Lil0="
    )]
    pub encryption_public_key: String,
    #[arg(
        long,
        env = "WORKFLOWS_OIDC_ENCRYPTION_PRIVATE_KEY",
        default_value = "7f3saJVP6ISBaarRJ5KyNF0IFezCFDEmC556ygO3kQk="
    )]
    pub encryption_private_key: String,
}
