import {
  authStatusCacheKey,
  baseGatewayUrl,
  buildLoginUrl,
  fetchAuthStatus,
  readAuthStatusCache,
  writeAuthStatusCache,
} from "../../lib/utils/authUtils";

// jsdom serves the tests from this origin; the gateway is same-origin under /auth
const origin = window.location.origin;
const otherGateway = "https://gateway.example";

describe("fetchAuthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the same-origin status route with the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(true),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAuthStatus({ accessToken: "tok" })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/auth/status`,
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
  });

  it("honours an explicit gateway override", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(true) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAuthStatus({ accessToken: "tok", gatewayUrl: otherGateway });

    expect(fetchMock).toHaveBeenCalledWith(
      `${otherGateway}/auth/status`,
      expect.anything(),
    );
  });

  it("treats a non-ok response as unauthenticated", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, json: () => Promise.resolve(true) }),
    );

    await expect(fetchAuthStatus({ accessToken: "tok" })).resolves.toBe(false);
  });

  it("propagates network failures to the caller", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(fetchAuthStatus({ accessToken: "tok" })).rejects.toThrow(
      "offline",
    );
  });

  it("passes the abort signal through", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(false) });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await fetchAuthStatus({ accessToken: "tok", signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/auth/status`,
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

describe("baseGatewayUrl", () => {
  it("defaults to the current origin", () => {
    expect(baseGatewayUrl()).toBe(origin);
  });

  test.each([
    [otherGateway, otherGateway],
    [`${otherGateway}/`, otherGateway],
    [`${otherGateway}/auth`, otherGateway],
    [`${otherGateway}/auth/`, otherGateway],
    // the historic AUTH_GATEWAY_LOGIN_URL form
    [`${otherGateway}/auth/login`, otherGateway],
    [`${otherGateway}/auth/status`, otherGateway],
  ])("reduces %s to its base", (input, expected) => {
    expect(baseGatewayUrl(input)).toBe(expected);
  });

  it("leaves an unrelated path intact", () => {
    expect(baseGatewayUrl(`${otherGateway}/gateway`)).toBe(
      `${otherGateway}/gateway`,
    );
  });
});

describe("buildLoginUrl", () => {
  it("builds a same-origin login url without a returnTo", () => {
    expect(buildLoginUrl()).toBe(`${origin}/auth/login`);
  });

  it("encodes returnTo as a query parameter", () => {
    expect(buildLoginUrl("https://app.example/visits?a=1")).toBe(
      `${origin}/auth/login?returnTo=https%3A%2F%2Fapp.example%2Fvisits%3Fa%3D1`,
    );
  });

  it("honours an explicit gateway override", () => {
    expect(buildLoginUrl(undefined, otherGateway)).toBe(
      `${otherGateway}/auth/login`,
    );
  });

  it("does not double up the path when given a full login url", () => {
    expect(buildLoginUrl(undefined, `${otherGateway}/auth/login`)).toBe(
      `${otherGateway}/auth/login`,
    );
  });
});

describe("authStatusCacheKey", () => {
  it("is stable for the same token", () => {
    expect(authStatusCacheKey("tok")).toBe(authStatusCacheKey("tok"));
  });

  it("differs per token and per gateway", () => {
    const base = authStatusCacheKey("tok");
    expect(authStatusCacheKey("other-tok")).not.toBe(base);
    expect(authStatusCacheKey("tok", otherGateway)).not.toBe(base);
  });

  it("matches across the base and full login url forms", () => {
    expect(authStatusCacheKey("tok", `${otherGateway}/auth/login`)).toBe(
      authStatusCacheKey("tok", otherGateway),
    );
  });

  it("does not embed the raw access token", () => {
    expect(authStatusCacheKey("secret-token")).not.toContain("secret-token");
  });
});

describe("auth status cache", () => {
  const cacheKey = authStatusCacheKey("tok");

  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("round-trips a written value", () => {
    writeAuthStatusCache(cacheKey, true);
    expect(readAuthStatusCache(cacheKey, 30000)).toBe(true);
  });

  it("round-trips a cached false", () => {
    writeAuthStatusCache(cacheKey, false);
    expect(readAuthStatusCache(cacheKey, 30000)).toBe(false);
  });

  it("returns null when nothing is cached", () => {
    expect(readAuthStatusCache(cacheKey, 30000)).toBeNull();
  });

  it("returns null once the entry is older than the ttl", () => {
    vi.useFakeTimers();
    writeAuthStatusCache(cacheKey, true);
    vi.advanceTimersByTime(30001);

    expect(readAuthStatusCache(cacheKey, 30000)).toBeNull();
  });

  it("returns null for an unparsable entry", () => {
    sessionStorage.setItem(cacheKey, "not json");
    expect(readAuthStatusCache(cacheKey, 30000)).toBeNull();
  });

  it("does not leak between keys", () => {
    writeAuthStatusCache(cacheKey, true);
    expect(
      readAuthStatusCache(authStatusCacheKey("other-tok"), 30000),
    ).toBeNull();
  });
});
