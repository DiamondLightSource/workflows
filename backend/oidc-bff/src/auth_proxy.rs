#[derive(Parser, Debug)]
#[command(author, version, about)]
struct Args {
    /// Path to config file (JSON or YAML)
    #[arg(
        short,
        long,
        env = "WORKFLOWS_AUTH_PROXY_CONFIG",
        default_value = "config.yaml"
    )]
    config: String,
}


#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    let args: Args = Args::try_parse()?;
    let config = Config::from_file(args.config)?;
    let port = config.port;
    let appstate = Arc::new(AppState::new(config).await?);

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rust TLS cryptography");

    let router = create_router(appstate);
    serve(router, port).await
}

fn create_router(state: Arc<AppState>) -> Router {
    let proxy: Router<()> =
        ReverseProxy::new("/", "https://staging.workflows.diamond.ac.uk/graphql").into();
    let proxy = proxy;

    Router::new()
        .nest_service("/api", proxy)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            inject_token_from_session::inject_token_from_session,
        ))
        .route("/healthcheck", get(healthcheck::healthcheck))
        .layer(session_layer)
        .with_state(state)
}

async fn serve(router: Router, port: u16) -> Result<()> {
    let listener =
        tokio::net::TcpListener::bind(SocketAddr::new(Ipv4Addr::UNSPECIFIED.into(), port)).await?;
    let service = router.into_make_service();
    axum::serve(listener, service).await?;
    Ok(())
}

async fn logout() {}

async fn debug(State(state): State<Arc<AppState>>, session: Session) -> Result<impl IntoResponse> {
    let auth_session_data: Option<LoginSessionData> =
        session.get(LoginSessionData::SESSION_KEY).await
            .map_err(|e| anyhow::anyhow!("Failed to read session: {}", e))?;

    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await
            .map_err(|e| anyhow::anyhow!("Failed to read session: {}", e))?;

    Ok(Json((
        state.config.clone(),
        auth_session_data,
        token_session_data,
    )))
}
