
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { getKeycloak } from "../utils/keycloak";
import { getUseAuthGateway } from "../utils/useAuthGateway";
import {
  buildLoginUrl,
} from "@diamondlightsource/workflows-lib-shared";

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;
const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;
const AUTH_GATEWAY_LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL;

const USE_AUTH_GATEWAY = getUseAuthGateway();

const keycloak = await getKeycloak();

let keycloakInitPromise: Promise<boolean> | null = null;

function ensureKeycloakInit(): Promise<boolean> {
  // Relay may already have initialized Keycloak.
  if (keycloak.authenticated) {
    return Promise.resolve(true);
  }

  if (!keycloakInitPromise) {
    keycloakInitPromise = keycloak.init({
      onLoad: "login-required",
      scope: KEYCLOAK_SCOPE,
    });
  }

  return keycloakInitPromise;
}

if (!USE_AUTH_GATEWAY) {
  keycloak.onTokenExpired = () => {
    void keycloak.updateToken(10);
  };
}

function redirectToAuthGatewayLogin(): void {
  const loginUrl = buildLoginUrl(
    window.location.href,
    AUTH_GATEWAY_LOGIN_URL,
  );

  window.location.assign(loginUrl);
}

const httpLink = new HttpLink({
  uri: HTTP_ENDPOINT,
  credentials: USE_AUTH_GATEWAY ? "include" : undefined,
  fetch: async (input, init) => {
    if (!keycloak.authenticated) {
      await ensureKeycloakInit();
    }

    const headers = new Headers(init?.headers);

    headers.set(
      "Accept",
      "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
    );

    headers.set("Content-Type", "application/json");

    if (!USE_AUTH_GATEWAY && keycloak.token) {
      headers.set("Authorization", `Bearer ${keycloak.token}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: USE_AUTH_GATEWAY ? "include" : init?.credentials,
    });

    if (USE_AUTH_GATEWAY && response.status === 401) {
      redirectToAuthGatewayLogin();
    }

    return response;
  },
});

const wsClient = createClient({
  url: WS_ENDPOINT,
  connectionParams: async () => {
    if (!USE_AUTH_GATEWAY && !keycloak.authenticated) {
      await ensureKeycloakInit();
    }

    if (!USE_AUTH_GATEWAY) {
      return {
        Authorization: `Bearer ${keycloak.token ?? ""}`,
      };
    }

    return {};
  },
});

const wsLink = new GraphQLWsLink(wsClient);

const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query);

    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink,
);

let apolloClient: ApolloClient | null = null;

export async function getApolloClient(): Promise<ApolloClient> {
  if (!apolloClient) {
    await ensureKeycloakInit();

    apolloClient = new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });
  }

  return apolloClient;
}
