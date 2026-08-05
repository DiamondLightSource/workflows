import "@testing-library/jest-dom";
import { getUser } from "relay-workflows-lib";
import * as utils from "../../lib/utils/coreUtils";

describe("getUser", () => {
  it("should return the mock user", async () => {
    expect(await getUser()).toStrictEqual({
      name: "Mo C. Kuser",
      fedid: "mockuser",
    });
  });

  it("should handle failed JWT parsing", async () => {
    vi.spyOn(utils, "parseJwt").mockImplementationOnce(() => {
      throw new Error("test error");
    });
    expect(await getUser()).toStrictEqual({
      name: undefined,
      fedid: undefined,
    });
  });

  it("should handle missing fedid/user", async () => {
    vi.spyOn(utils, "parseJwt").mockReturnValueOnce({ name: "I. Matest" });
    expect(await getUser()).toStrictEqual({
      name: "I. Matest",
      fedid: undefined,
    });
  });
});

describe("getUser with auth gateway enabled", () => {
  beforeEach(() => {
    window.__USE_AUTH_GATEWAY__ = "true";
    vi.resetModules();
  });

  afterEach(() => {
    delete window.__USE_AUTH_GATEWAY__;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches user info from the auth gateway", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ name: "Mo C. Kuser", fedid: "mockuser" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getUser } = await import("relay-workflows-lib");

    expect(await getUser()).toStrictEqual({
      name: "Mo C. Kuser",
      fedid: "mockuser",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://workflows.diamond.ac.uk/auth/userinfo",
      {
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("redirects to login and returns null on 401", async () => {
    const assignMock = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }),
    );
    const { getUser } = await import("relay-workflows-lib");

    expect(await getUser()).toBeNull();
    expect(assignMock).toHaveBeenCalledWith(
      `https://workflows.diamond.ac.uk/auth/login?returnTo=${encodeURIComponent(
        window.location.href,
      )}`,
    );
  });

  it("returns null on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );
    const { getUser } = await import("relay-workflows-lib");

    expect(await getUser()).toBeNull();
  });

  it("returns null if the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { getUser } = await import("relay-workflows-lib");

    expect(await getUser()).toBeNull();
  });
});
