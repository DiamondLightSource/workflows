/* eslint-disable */
import {
  Environment,
  Network,
  RecordSource,
  Store,
  FetchFunction,
} from "relay-runtime";
import keycloak from "./keycloak";

const HTTP_ENDPOINT = "https://graph.diamond.ac.uk";

const fetchFn: FetchFunction = async (request, variables) => {
  try {
    const authenticated = await keycloak.init({
      onLoad: "login-required",
    });

    if (!authenticated) {
      throw new Error("Keycloak authentication failed");
    }

    if (keycloak.isTokenExpired()) {
      await keycloak.updateToken(30);
    }

    const token = keycloak.token;

    if (!token) {
      throw new Error("Failed to retrieve token");
    }

    const response = await fetch(HTTP_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.text,
        variables,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error in Keycloak authentication:", error);
    alert("Authentication failed. Please log in again.");
    // keycloak.login();
    throw error;
  }
};

function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  });
}

export const RelayEnvironment = createRelayEnvironment();
