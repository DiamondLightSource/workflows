import { useAuthGateway } from "./useAuthGateway";

export async function getKeycloak() {
  const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

  if (isMocking) {
    // only import when mocking
    const mockKeycloak = await import("../../mocks/mockKeycloak").then(
      (mod) => mod.default,
    );
    return mockKeycloak;
  }

  if (!useAuthGateway()) {
    const { default: Keycloak } = await import("keycloak-js");
    return new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT,
    });
  }

  return {
    init: () => Promise.resolve(true),
    authenticated: true,
    token: null,
    updateToken: () => Promise.resolve(true),
    onTokenExpired: null as (() => void) | null,
  };
}
