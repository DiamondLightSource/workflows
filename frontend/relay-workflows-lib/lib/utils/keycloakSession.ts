import { getKeycloak, KeycloakLike } from "./keycloak";

const KEYCLOAK_SCOPE = import.meta.env.VITE_KEYCLOAK_SCOPE;

/** The single keycloak-js instance shared by the whole library.
 *
 * It lives here rather than in RelayEnvironment so that other modules (the
 * auth helpers used by the navbar, for example) can reuse it. Calling
 * getKeycloak() again would construct a second, separately initialised
 * instance whose token and authenticated state would drift from this one.
 */
export const keycloak: KeycloakLike = await getKeycloak();

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
