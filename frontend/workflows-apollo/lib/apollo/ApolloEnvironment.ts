import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  ApolloLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { getUseAuthGateway } from "../auth/utils/useAuthGateway";

import {
  keycloak,
  ensureKeycloakInit,
  redirectToAuthGatewayLogin,
} from "../auth/utils/keycloak";

const USE_AUTH_GATEWAY = getUseAuthGateway();
const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;

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

export const wsClient = createClient({
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

const link = ApolloLink.split(
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
