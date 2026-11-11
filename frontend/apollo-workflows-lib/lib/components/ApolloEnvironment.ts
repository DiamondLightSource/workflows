import { getKeycloak } from "../utils/keycloak";
import { createClient } from "graphql-ws";
import { AuthState } from "@diamondlightsource/sci-react-ui";
import { parseJwt } from "../utils/coreUtils";
import { JSONObject } from "workflows-lib";
import {
  buildLoginUrl,
  baseGatewayUrl,
} from "@diamondlightsource/workflows-lib-shared";
import { getUseAuthGateway } from "../utils/useAuthGateway";
import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";


const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;
const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;
const USE_AUTH_GATEWAY = getUseAuthGateway();
const AUTH_GATEWAY_LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL;

const keycloak = await getKeycloak();

let kcinitPromise: Promise<boolean> | null = null;

// needed to prevent repeated refresh of page when using subscriptions
function ensureKeycloakInit(): Promise<boolean> {
  if (!kcinitPromise) {
    kcinitPromise = keycloak
      .init({
        onLoad: "login-required",
        scope: KEYCLOAK_SCOPE,
      })
      .catch((err: unknown) => {
        console.error("Keycloak init failed", err);
        return false;
      });
  }
  return kcinitPromise;
}

if (!USE_AUTH_GATEWAY) {
  keycloak.onTokenExpired = () => {
    void keycloak.updateToken(10);
  };
}

function redirectToAuthGatewayLogin() {
  const returnTo = window.location.href;
  const loginUrl = buildLoginUrl(returnTo, AUTH_GATEWAY_LOGIN_URL);
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


export async function getUser(): Promise<AuthState | null> {
  if (USE_AUTH_GATEWAY) {
    try {
      const userInfoUrl = buildUserInfoUrl(AUTH_GATEWAY_LOGIN_URL);
      const resp = await fetch(userInfoUrl, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (resp.status === 401) {
        redirectToAuthGatewayLogin();
        return null;
      }

      if (!resp.ok) {
        return null;
      }

      const data = (await resp.json()) as JSONObject;
      const user: AuthState = {
        name: data.name as string,
        fedid: data.fedid as string,
      };

      return user;
    } catch (error) {
      console.error("Failed to fetch user info: ", error);
      return null;
    }
  }

  if (!keycloak.authenticated) {
    await ensureKeycloakInit();
  }

  if (keycloak.token) {
    let parsedToken: JSONObject = {};

    try {
      parsedToken = parseJwt(keycloak.token);
    } catch (error) {
      console.error("Could not parse JWT: ", error);
    }

    const user: AuthState = {
      name: parsedToken.name as string,
      fedid: (parsedToken.preferred_username ?? parsedToken.fedid) as string,
    };

    return user;
  } else return null;
}

function buildUserInfoUrl(gatewayUrl?: string): string {
  const userInfoUrl = new URL(`${baseGatewayUrl(gatewayUrl)}/auth/me`);
  return userInfoUrl.toString();
}
