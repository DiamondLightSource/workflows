import { useEffect, useMemo, useState } from "react";
import {
  authStatusCacheKey,
  fetchAuthStatus,
  readAuthStatusCache,
  writeAuthStatusCache,
} from "../utils/authUtils";

export interface UseAuthStatusOptions {
  accessToken?: string;
  gatewayUrl?: string;
  cacheTtlMs?: number;
}

export interface AuthStatus {
  authenticated: boolean;
  loading: boolean;
}

interface FetchedStatus {
  cacheKey: string;
  authenticated: boolean;
}

export function useAuthStatus({
  accessToken,
  gatewayUrl,
  cacheTtlMs = 30000,
}: UseAuthStatusOptions): AuthStatus {
  const cacheKey = useMemo(
    () => (accessToken ? authStatusCacheKey(accessToken, gatewayUrl) : null),
    [accessToken, gatewayUrl],
  );

  const known = useMemo(
    () => (cacheKey ? readAuthStatusCache(cacheKey, cacheTtlMs) : false),
    [cacheKey, cacheTtlMs],
  );

  const [fetched, setFetched] = useState<FetchedStatus | null>(null);

  useEffect(() => {
    if (!accessToken || !cacheKey || known !== null) return;

    const controller = new AbortController();
    void fetchAuthStatus({
      accessToken,
      gatewayUrl,
      signal: controller.signal,
    })
      .then((authenticated) => {
        writeAuthStatusCache(cacheKey, authenticated);
        setFetched({ cacheKey, authenticated });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Failed to check authentication status", error);
        setFetched({ cacheKey, authenticated: false });
      });

    return () => {
      controller.abort();
    };
  }, [cacheKey, known, accessToken, gatewayUrl]);

  const resolved =
    known ?? (fetched?.cacheKey === cacheKey ? fetched.authenticated : null);

  return { authenticated: resolved ?? false, loading: resolved === null };
}
