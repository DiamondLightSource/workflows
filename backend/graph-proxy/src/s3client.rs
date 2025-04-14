use aws_credential_types::{provider::SharedCredentialsProvider, Credentials};
pub use aws_sdk_s3::{config::Region, Client};
use clap::{ArgAction::SetTrue, Parser};
use derive_more::{Deref, FromStr, Into};
use url::Url;

/// S3 bucket where the artifacts are stored
#[derive(Debug, Clone, Deref, FromStr, Into)]
pub struct S3Bucket(pub String);

/// Arguments for configuring the S3 Client.
#[derive(Debug, Parser, Clone)]
pub struct S3ClientArgs {
    /// The URL of the S3 endpoint to retrieve artifacts from.
    #[arg(long, env)]
    pub s3_endpoint_url: Option<Url>,
    /// The ID of the access key used for S3 authorization.
    #[arg(long, env)]
    pub s3_access_key_id: Option<String>,
    /// The secret access key used for S3 authorization.
    #[arg(long, env)]
    pub s3_secret_access_key: Option<String>,
    /// Forces path style endpoint URIs for S3 queries.
    #[arg(long, env, action = SetTrue)]
    pub s3_force_path_style: bool,
    /// The AWS region of the S3 bucket.
    #[arg(long, env)]
    pub s3_region: Option<String>,
}

impl From<S3ClientArgs> for Client {
    fn from(args: S3ClientArgs) -> Self {
        let credentials = Credentials::new(
            args.s3_access_key_id.unwrap_or_default(),
            args.s3_secret_access_key.unwrap_or_default(),
            None,
            None,
            "Other",
        );
        let credentials_provider = SharedCredentialsProvider::new(credentials);
        let mut config_builder = aws_sdk_s3::config::Builder::new();
        config_builder.set_credentials_provider(Some(credentials_provider));
        config_builder.set_endpoint_url(args.s3_endpoint_url.map(String::from));
        config_builder.set_force_path_style(Some(args.s3_force_path_style));
        config_builder.set_region(Some(Region::new(
            args.s3_region.unwrap_or(String::from("undefined")),
        )));
        let config = config_builder.build();
        Client::from_conf(config)
    }
}
