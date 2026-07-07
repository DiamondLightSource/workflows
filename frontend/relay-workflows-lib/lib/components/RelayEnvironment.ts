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

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;
const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;
const USE_AUTH_GATEWAY = import.meta.env.VITE_USE_AUTH_GATEWAY === "true";
const VITE_AUTH_GATEWAY_LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL;

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
    console.log("JWT expired");
    keycloak
      .updateToken(10)
      .then((refreshed) => {
        if (refreshed) {
          console.log("Fetched new JWT");
        } else {
          console.warn("Token still valid");
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to update JWT", err);
      });
  };
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

  const resp = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      query: request.text, // <-- The GraphQL document composed by Relay
      variables,
    }),
  });
  if (USE_AUTH_GATEWAY && resp.status === 401) {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.assign(
      `${VITE_AUTH_GATEWAY_LOGIN_URL}?returnTo=${returnTo}`,
    );
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
          const data = response.data;
          if (data) {
            sink.next({ data } as GraphQLResponse);
          } else if (data == null) {
            console.warn("Data is null:", response);
          } else {
            console.error("Subscription error response:", response);
            sink.error(new Error("Subscription response missing data"));
          }
        },
        error: sink.error.bind(sink),
        complete: sink.complete.bind(sink),
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
