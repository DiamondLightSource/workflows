import { AuthState } from "@diamondlightsource/sci-react-ui";
import { JSONObject } from "workflows-lib";
import { externalRedirect, parseJwt } from "./coreUtils";
import { getUseAuthGateway } from "./useAuthGateway";
import { ensureKeycloakInit, keycloak } from "./keycloakSession";

/** Login / logout / current user, for both supported authentication modes.
 *
 * keycloak-js mode: the browser holds the JWT, so the user is read from the
 * token and keycloak-js drives the redirects.
 *
 * auth-gateway mode: the session lives server side behind an httpOnly cookie,
 * so login is a redirect to the gateway, logout is a call to the gateway
 * followed by a redirect to Keycloak to end the SSO session, and the signed in
 * state is determined by whether an authenticated request succeeds.
 *
 * Everything else in the library should go through this module rather than
 * touching keycloak-js or the gateway directly.
 */

const GRAPH_URL = import.meta.env.VITE_GRAPH_URL;
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;
const AUTH_GATEWAY_LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL as
  | string
  | undefined;

/** auth-gateway serves its endpoints under a common prefix, of which only the
 * login URL is configured, so the others are derived from it.
 */
function authGatewayUrl(endpoint: "login" | "logout"): string {
  const loginUrl: string = AUTH_GATEWAY_LOGIN_URL ?? "";
  return loginUrl.replace(/\/login\/?$/, `/${endpoint}`);
}

/** The Keycloak RP initiated logout endpoint.
 *
 * No post_logout_redirect_uri is sent: the gateway's Keycloak client only has
 * the gateway callback registered, and Keycloak rejects unregistered redirect
 * URIs.
 */
function keycloakEndSessionUrl(): string | null {
  if (!KEYCLOAK_URL || !KEYCLOAK_REALM) {
    return null;
  }
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;
}

/** Whether the auth-gateway session cookie is currently accepted.
 *
 * The gateway responds 401 to proxied requests when the session holds no
 * token, so any authenticated request doubles as a session check.
 */
async function isAuthenticatedWithAuthGateway(): Promise<boolean> {
  try {
    const resp = await fetch(GRAPH_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept:
          "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "{ __typename }" }),
    });
    return resp.ok;
  } catch (error) {
    console.error("Failed to check auth-gateway session: ", error);
    return false;
  }
}

/** The signed in user, or null when signed out.
 *
 * In auth-gateway mode the name and fedid are not available to the browser, so
 * an authenticated user is reported without them. See the follow up note in
 * frontend/README.md.
 */
export async function getUser(): Promise<AuthState | null> {
  if (getUseAuthGateway()) {
    return (await isAuthenticatedWithAuthGateway())
      ? { fedid: "Signed in" }
      : null;
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

/** Start the login flow, returning to `returnTo` (the current page by default)
 * once it completes.
 */
export async function login(returnTo?: string): Promise<void> {
  const redirectUri = returnTo ?? window.location.href;

  if (getUseAuthGateway()) {
    externalRedirect(
      `${authGatewayUrl("login")}?returnTo=${encodeURIComponent(redirectUri)}`,
    );
    return;
  }

  await keycloak.login({ redirectUri });
}

/** End the session.
 *
 * In auth-gateway mode this clears the gateway session and its stored refresh
 * token, then ends the Keycloak SSO session so that logging in again asks for
 * credentials rather than silently reauthenticating.
 */
export async function logout(): Promise<void> {
  if (!getUseAuthGateway()) {
    await keycloak.logout({ redirectUri: window.location.origin });
    return;
  }

  try {
    const resp = await fetch(authGatewayUrl("logout"), {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) {
      console.error("auth-gateway logout failed: ", resp.status);
    }
  } catch (error) {
    console.error("auth-gateway logout failed: ", error);
  }

  const endSessionUrl = keycloakEndSessionUrl();
  if (endSessionUrl) {
    externalRedirect(endSessionUrl);
  } else {
    externalRedirect(window.location.origin);
  }
}
