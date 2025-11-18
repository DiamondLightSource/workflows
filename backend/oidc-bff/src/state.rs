use crate::config::Config;

#[derive(Debug, Clone)]
pub struct AppState {
    pub config: Config,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        AppState { config: config }
    }
}
