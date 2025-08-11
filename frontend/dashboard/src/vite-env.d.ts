/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KEYCLOAK_URL: string;
  readonly VITE_KEYCLOAK_REALM: string;
  readonly VITE_KEYCLOAK_CLIENT: string;
  readonly VITE_GRAPH_URL: string;
}

interface importMeta {
  readonly env: ImportMetaEnv;
}
