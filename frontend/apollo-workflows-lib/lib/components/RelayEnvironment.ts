import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
  SubscribeFunction,
  GraphQLResponse,
  Observable,
} from "relay-runtime";
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

const fetchFn: FetchFunction = async (request, variables) => {
  if (!keycloak.authenticated) {
    await ensureKeycloakInit();
  }

  const headers: Record<string, string> = {
    Accept:
      "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
    "Content-Type": "application/json",
  };

  if (!USE_AUTH_GATEWAY && keycloak.token) {
    headers.Authorization = `Bearer ${keycloak.token}`;
  }

  const fetchOptions: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  };

  if (USE_AUTH_GATEWAY) {
    fetchOptions.credentials = "include";
  }

  const resp = await fetch(HTTP_ENDPOINT, fetchOptions);

  if (USE_AUTH_GATEWAY && resp.status === 401) {
    redirectToAuthGatewayLogin();
    return {};
  }

  return await resp.json(); // eslint-disable-line @typescript-eslint/no-unsafe-return
};

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

const subscribeFn: SubscribeFunction = (operation, variables) => {
  return Observable.create((sink) => {
    const cleanup = wsClient.subscribe(
      {
        operationName: operation.name,
        query: operation.text ?? "",
        variables,
      },
      {
        next: (response) => {
          sink.next(response as GraphQLResponse);
        },

        error: (error) => {
          sink.error(error as Error);
        },

        complete: () => {
          sink.complete();
        },
      },
    );

    return cleanup;
  });
};

let RelayEnvironment: Environment | null = null;

export async function getRelayEnvironment(): Promise<Environment> {
  if (!RelayEnvironment) {
    await ensureKeycloakInit();
    RelayEnvironment = new Environment({
      network: Network.create(fetchFn, subscribeFn),
      store: new Store(new RecordSource()),
    });
  }

  return RelayEnvironment;
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
