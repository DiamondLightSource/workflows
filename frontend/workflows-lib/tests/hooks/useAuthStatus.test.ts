import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStatus } from "../../lib/hooks/useAuthStatus";

const origin = window.location.origin;

const mockFetch = (authenticated: boolean) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(authenticated),
  });

describe("useAuthStatus", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves to authenticated from the same-origin gateway", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAuthStatus({ accessToken: "tok" }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.authenticated).toBe(true);
    });
    expect(result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/auth/status`,
      expect.anything(),
    );
  });

  it("does not fetch without an access token", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAuthStatus({}));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.authenticated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reuses the cached result on remount without re-fetching", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const first = renderHook(() => useAuthStatus({ accessToken: "tok" }));
    await waitFor(() => {
      expect(first.result.current.authenticated).toBe(true);
    });
    first.unmount();

    const second = renderHook(() => useAuthStatus({ accessToken: "tok" }));
    await waitFor(() => {
      expect(second.result.current.authenticated).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses a cached false without re-fetching", async () => {
    const fetchMock = mockFetch(false);
    vi.stubGlobal("fetch", fetchMock);

    const first = renderHook(() => useAuthStatus({ accessToken: "tok" }));
    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });
    first.unmount();

    const second = renderHook(() => useAuthStatus({ accessToken: "tok" }));
    await waitFor(() => {
      expect(second.result.current.loading).toBe(false);
    });

    expect(second.result.current.authenticated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-fetches when the access token changes", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ accessToken }: { accessToken: string }) =>
        useAuthStatus({ accessToken }),
      { initialProps: { accessToken: "tok" } },
    );
    await waitFor(() => {
      expect(result.current.authenticated).toBe(true);
    });

    rerender({ accessToken: "other-tok" });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${origin}/auth/status`,
      expect.objectContaining({
        headers: { Authorization: "Bearer other-tok" },
      }),
    );
  });

  it("falls back to unauthenticated when the request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { result } = renderHook(() => useAuthStatus({ accessToken: "tok" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.authenticated).toBe(false);
  });

  it("aborts the in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init: RequestInit) => {
        capturedSignal = init.signal ?? undefined;
        return new Promise(() => {});
      });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderHook(() => useAuthStatus({ accessToken: "tok" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
