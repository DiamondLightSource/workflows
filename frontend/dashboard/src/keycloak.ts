import Keycloak from "keycloak-js";

export async function getKeycloak() {
  const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

  if (isMocking) {
    // only import when mocking
    const mockKeycloak = await import("./mocks/mockKeycloak").then(
      (mod) => mod.default,
    );
    return mockKeycloak;
  }

  return new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
  });
}
