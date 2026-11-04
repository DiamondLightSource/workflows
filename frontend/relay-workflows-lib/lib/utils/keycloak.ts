import { getUseAuthGateway } from "./useAuthGateway";

declare global {
  interface Window {
    __USE_AUTH_GATEWAY__?: string;
  }
}

let keycloakInstancePromise:
  | ReturnType<typeof createKeycloak>
  | undefined;

function createKeycloak() {
  return (async () => {
    const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

    if (isMocking) {
      const mockKeycloak = await import("../../mocks/mockKeycloak").then(
        (mod) => mod.default,
      );

      return mockKeycloak;
    }

    if (!getUseAuthGateway()) {
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
  })();
}

export function getKeycloak() {
  if (!keycloakInstancePromise) {
    keycloakInstancePromise = createKeycloak();
  }

  return keycloakInstancePromise;
}
