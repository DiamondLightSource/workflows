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
import { createClient } from "graphql-ws";
import { getUseAuthGateway } from "../utils/useAuthGateway";
import { ensureKeycloakInit, keycloak } from "../utils/keycloakSession";
import { login } from "../utils/auth";

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;
const USE_AUTH_GATEWAY = getUseAuthGateway();

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
    await login();
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
