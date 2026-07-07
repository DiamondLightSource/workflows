/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KEYCLOAK_URL: string;
  readonly VITE_KEYCLOAK_REALM: string;
  readonly VITE_KEYCLOAK_CLIENT: string;
  readonly VITE_KEYCLOAK_SCOPE: string;
  readonly VITE_GRAPH_URL: string;
  readonly VITE_GRAPH_WS_URL: string;
  readonly VITE_USE_AUTH_GATEWAY: string;
  readonly VITE_AUTH_GATEWAY_LOGIN_URL: string;
}

interface importMeta {
  readonly env: ImportMetaEnv;
}
