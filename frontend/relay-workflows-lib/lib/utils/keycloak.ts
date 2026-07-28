import { getUseAuthGateway } from "./useAuthGateway";

/** The subset of the keycloak-js API used by this library.
 *
 * Declared as an interface so the mock and the auth-gateway stub below are
 * interchangeable with a real Keycloak instance without pulling keycloak-js
 * into the bundle when it is disabled.
 */
export interface KeycloakLike {
  init(options?: { onLoad?: string; scope?: string }): Promise<boolean>;
  login(options?: { redirectUri?: string }): Promise<void>;
  logout(options?: { redirectUri?: string }): Promise<void>;
  updateToken(minValidity?: number): Promise<boolean>;
  authenticated?: boolean;
  token?: string | null;
  onTokenExpired?: (() => void) | null;
}

export async function getKeycloak(): Promise<KeycloakLike> {
  const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

  if (isMocking) {
    // only import when mocking
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

  // auth-gateway holds the session server side, so there is nothing to
  // initialise, no token to hold and no keycloak-js API to call
  return {
    init: () => Promise.resolve(true),
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    updateToken: () => Promise.resolve(true),
    authenticated: true,
    token: null,
    onTokenExpired: null,
  };
}
