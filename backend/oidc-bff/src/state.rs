use crate::config::Config;
use crate::session::SessionStore;
use crate::session::create_session_store;

#[derive(Debug, Clone)]
pub struct AppState {
    pub config: Config,
    pub session: SessionStore,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        AppState {
            config: config,
            session: create_session_store(),
        }
    }
}
