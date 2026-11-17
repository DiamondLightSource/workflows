import { getUseAuthGateway } from "./useAuthGateway";
import { AuthState } from "@diamondlightsource/sci-react-ui";
import { parseJwt } from "./coreUtils";
import { JSONObject } from "../../types";
import { buildLoginUrl, baseGatewayUrl } from "./authUtils";

export async function getKeycloak() {
  const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

  if (isMocking) {
    // only import when mocking
    const mockKeycloak = await import("../mockKeycloak.ts").then(
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
}

const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;
const USE_AUTH_GATEWAY = getUseAuthGateway();
const AUTH_GATEWAY_LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL;

export const keycloak = await getKeycloak();

let kcinitPromise: Promise<boolean> | null = null;

// needed to prevent repeated refresh of page when using subscriptions
export function ensureKeycloakInit(): Promise<boolean> {
  if (!kcinitPromise) {
    kcinitPromise = keycloak
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

if (!USE_AUTH_GATEWAY) {
  keycloak.onTokenExpired = () => {
    void keycloak.updateToken(10);
  };
}

export function redirectToAuthGatewayLogin() {
  const returnTo = window.location.href;
  const loginUrl = buildLoginUrl(returnTo, AUTH_GATEWAY_LOGIN_URL);
  window.location.assign(loginUrl);
}

export async function getUser(): Promise<AuthState | null> {
  if (USE_AUTH_GATEWAY) {
    try {
      const userInfoUrl = buildUserInfoUrl(AUTH_GATEWAY_LOGIN_URL);
      const resp = await fetch(userInfoUrl, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (resp.status === 401) {
        redirectToAuthGatewayLogin();
        return null;
      }

      if (!resp.ok) {
        return null;
      }

      const data = (await resp.json()) as JSONObject;
      const user: AuthState = {
        name: data.name as string,
        fedid: data.fedid as string,
      };

      return user;
    } catch (error) {
      console.error("Failed to fetch user info: ", error);
      return null;
    }
  }

  if (!keycloak.authenticated) {
    await ensureKeycloakInit();
  }

  if (keycloak.token) {
    let parsedToken: JSONObject = {};

    try {
      parsedToken = parseJwt(keycloak.token);
    } catch (error) {
      console.error("Could not parse JWT: ", error);
    }

    const user: AuthState = {
      name: parsedToken.name as string,
      fedid: (parsedToken.preferred_username ?? parsedToken.fedid) as string,
    };

    return user;
  } else return null;
}

function buildUserInfoUrl(gatewayUrl?: string): string {
  const userInfoUrl = new URL(`${baseGatewayUrl(gatewayUrl)}/auth/me`);
  return userInfoUrl.toString();
}
