import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from "relay-runtime";
import keycloak from "./keycloak";

const HTTP_ENDPOINT = "https://workflows.diamond.ac.uk/graphql";

const kcinit = keycloak.init({
  onLoad: "login-required"
})
.then(
  auth => {
      console.info("Authenticated");
      console.log("auth", auth);
      keycloak.onTokenExpired = () => {
        console.log("token expired");
      };
  },
  () => {
    console.error("Authentication failed");
  }
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


function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
}

export const RelayEnvironment = createRelayEnvironment();
