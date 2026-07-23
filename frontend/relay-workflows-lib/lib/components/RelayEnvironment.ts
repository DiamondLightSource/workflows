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
import { getUseAuthGateway } from "../utils/useAuthGateway";

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;
const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;
const USE_AUTH_GATEWAY = getUseAuthGateway();
const AUTH_GATEWAY_LOGIN_URL =
  import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL;

// No top-level await!
let keycloak: Awaited<ReturnType<typeof getKeycloak>> | null = null;
let keycloakPromise: Promise<Awaited<ReturnType<typeof getKeycloak>>> | null =
  null;
let kcinitPromise: Promise<boolean> | null = null;

async function getKeycloakInstance() {
  if (keycloak) return keycloak;

  if (!keycloakPromise) {
    keycloakPromise = getKeycloak();
  }

  keycloak = await keycloakPromise;

  if (!USE_AUTH_GATEWAY) {
    keycloak.onTokenExpired = () => {
      console.log("JWT expired");
      keycloak!
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

  return keycloak;
}

async function ensureKeycloakInit(): Promise<boolean> {
  const kc = await getKeycloakInstance();

  if (!kcinitPromise) {
    kcinitPromise = kc
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

const fetchFn: FetchFunction = async (request, variables) => {
  const kc = await getKeycloakInstance();

  if (!kc.authenticated) {
    await ensureKeycloakInit();
  }

  const headers: Record<string, string> = {
    Accept:
      "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
    "Content-Type": "application/json",
  };

  if (!USE_AUTH_GATEWAY && kc.token) {
    headers.Authorization = `Bearer ${kc.token}`;
  }

  const resp = await fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers,
    //    credentials: "include",
    body: JSON.stringify({
      query: request.text,
      variables,
    }),
  });

  if (USE_AUTH_GATEWAY && resp.status === 401) {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.assign(`${AUTH_GATEWAY_LOGIN_URL}?returnTo=${returnTo}`);
    return {};
  }

  return await resp.json();
};

export const wsClient = createClient({
  url: WS_ENDPOINT,
  connectionParams: async () => {
    const kc = await getKeycloakInstance();

    if (!USE_AUTH_GATEWAY && !kc.authenticated) {
      await ensureKeycloakInit();
    }

    if (!USE_AUTH_GATEWAY) {
      return {
        Authorization: `Bearer ${kc.token ?? ""}`,
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
  const kc = await getKeycloakInstance();

  if (!kc.authenticated) {
    await ensureKeycloakInit();
  }

  if (kc.token) {
    let parsedToken: JSONObject = {};

    try {
      parsedToken = parseJwt(kc.token);
    } catch (error) {
      console.error("Could not parse JWT:", error);
    }

    return {
      name: parsedToken.name as string,
      fedid: (parsedToken.preferred_username ?? parsedToken.fedid) as string,
    };
  }

  return null;
}
