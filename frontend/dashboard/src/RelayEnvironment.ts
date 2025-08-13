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
import { createClient } from 'graphql-ws';

const HTTP_ENDPOINT = import.meta.env.VITE_GRAPH_URL;
const WS_ENDPOINT = import.meta.env.VITE_GRAPH_WS_URL;

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

const kcinit = keycloak
  .init({
    onLoad: "login-required",
  })
  .then(
    (auth) => {
      console.info("Authenticated");
      console.log("auth", auth);
    },
    () => {
      console.error("Authentication failed");
    },
  );

const fetchFn: FetchFunction = async (request, variables) => {
  if (!keycloak.authenticated) {
    await kcinit;
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
      await kcinit;
    }
    return {
      Authorization: `Bearer ${keycloak.token}`,
    };
  },
});

const subscribeFn: SubscribeFunction = (operation, variables) => {
  return Observable.create((sink) => {
    const cleanup = wsClient.subscribe(
      {
        operationName: operation.name,
        query: operation.text!,
        variables,
      },
      {
        next: (response) => {
          if (response.data !== null) {
            sink.next(response as GraphQLResponse);
          } else {
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

function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchFn, subscribeFn),
    store: new Store(new RecordSource()),
  });
}

export const RelayEnvironment = createRelayEnvironment();
