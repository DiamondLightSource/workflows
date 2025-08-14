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
import keycloak from "./keycloak";
import { createClient } from "graphql-ws";

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;

let kcinitPromise: Promise<boolean> | null = null;

// needed to prevent repeated refresh of page when using subscriptions
function ensureKeycloakInit(): Promise<boolean> {
  if (!kcinitPromise) {
    kcinitPromise = keycloak.init({
      onLoad: "login-required",
    });
  }
  return kcinitPromise;
}

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

const fetchFn: FetchFunction = async (request, variables) => {
  if (!keycloak.authenticated) {
    await ensureKeycloakInit();
  }

  if (keycloak.token) {
    const resp = await fetch(HTTP_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        Accept:
          "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.text, // <-- The GraphQL document composed by Relay
        variables,
      }),
    });

    return await resp.json(); // eslint-disable-line @typescript-eslint/no-unsafe-return
  } else {
    console.log("Not authenticated yet");
    return {};
  }
};

const wsClient = createClient({
  url: WS_ENDPOINT,
  connectionParams: async () => {
    if (!keycloak.authenticated) {
      await ensureKeycloakInit();
    }
    return {
      Authorization: `Bearer ${keycloak.token ?? ""}`,
    };
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
