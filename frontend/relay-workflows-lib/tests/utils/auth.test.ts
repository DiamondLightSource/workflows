import "@testing-library/jest-dom";
import { getUser, login, logout } from "../../lib/utils/auth";
import { keycloak } from "../../lib/utils/keycloakSession";
import * as coreUtils from "../../lib/utils/coreUtils";

const LOGIN_URL = import.meta.env.VITE_AUTH_GATEWAY_LOGIN_URL as string;
const LOGOUT_URL = LOGIN_URL.replace(/\/login\/?$/, "/logout");
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL as string;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM as string;
const END_SESSION_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`;

const useAuthGateway = (enabled: boolean) => {
  window.__USE_AUTH_GATEWAY__ = enabled ? "true" : "false";
};

describe("auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthGateway(false);
  });

  afterEach(() => {
    delete window.__USE_AUTH_GATEWAY__;
  });

  describe("with keycloak-js", () => {
    it("reads the user from the token", async () => {
      expect(await getUser()).toStrictEqual({
        name: "Mo C. Kuser",
        fedid: "mockuser",
      });
    });

    it("handles failed JWT parsing", async () => {
      vi.spyOn(coreUtils, "parseJwt").mockImplementationOnce(() => {
        throw new Error("test error");
      });
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await getUser()).toStrictEqual({
        name: undefined,
        fedid: undefined,
      });
    });

    it("handles a missing fedid", async () => {
      vi.spyOn(coreUtils, "parseJwt").mockReturnValueOnce({
        name: "I. Matest",
      });
      expect(await getUser()).toStrictEqual({
        name: "I. Matest",
        fedid: undefined,
      });
    });

    it("logs in via keycloak-js", async () => {
      const loginSpy = vi.spyOn(keycloak, "login");
      await login();
      expect(loginSpy).toHaveBeenCalledWith({
        redirectUri: window.location.href,
      });
    });

    it("logs out via keycloak-js", async () => {
      const logoutSpy = vi.spyOn(keycloak, "logout");
      await logout();
      expect(logoutSpy).toHaveBeenCalledWith({
        redirectUri: window.location.origin,
      });
    });
  });

  describe("with auth-gateway", () => {
    beforeEach(() => {
      useAuthGateway(true);
    });

    it("reports a user when the session is accepted", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
      );
      expect(await getUser()).toStrictEqual({ fedid: "Signed in" });
    });

    it("reports no user when the session is rejected", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("", { status: 401 }))),
      );
      expect(await getUser()).toBeNull();
    });

    it("reports no user when the request fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("network down"))),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await getUser()).toBeNull();
    });

    it("does not call keycloak-js", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
      );
      const initSpy = vi.spyOn(keycloak, "init");
      const loginSpy = vi.spyOn(keycloak, "login");
      const logoutSpy = vi.spyOn(keycloak, "logout");
      vi.spyOn(coreUtils, "externalRedirect").mockImplementation(() => {});

      await getUser();
      await login();
      await logout();

      expect(initSpy).not.toHaveBeenCalled();
      expect(loginSpy).not.toHaveBeenCalled();
      expect(logoutSpy).not.toHaveBeenCalled();
    });

    it("redirects to the gateway login endpoint", async () => {
      const redirectSpy = vi
        .spyOn(coreUtils, "externalRedirect")
        .mockImplementation(() => {});
      await login("https://workflows.diamond.ac.uk/workflows");
      expect(redirectSpy).toHaveBeenCalledWith(
        `${LOGIN_URL}?returnTo=${encodeURIComponent("https://workflows.diamond.ac.uk/workflows")}`,
      );
    });

    it("ends the gateway session, then the keycloak session", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve(new Response("", { status: 200 })),
      );
      vi.stubGlobal("fetch", fetchMock);
      const redirectSpy = vi
        .spyOn(coreUtils, "externalRedirect")
        .mockImplementation(() => {});

      await logout();

      expect(fetchMock).toHaveBeenCalledWith(LOGOUT_URL, {
        method: "POST",
        credentials: "include",
      });
      expect(redirectSpy).toHaveBeenCalledWith(END_SESSION_URL);
    });

    it("still ends the keycloak session when the gateway logout fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response("", { status: 500 }))),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});
      const redirectSpy = vi
        .spyOn(coreUtils, "externalRedirect")
        .mockImplementation(() => {});

      await logout();

      expect(redirectSpy).toHaveBeenCalledWith(END_SESSION_URL);
    });
  });
});
