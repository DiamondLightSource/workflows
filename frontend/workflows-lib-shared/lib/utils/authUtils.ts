export interface AuthStatusRequest {
  accessToken: string;
  gatewayUrl?: string;
  signal?: AbortSignal;
}

interface CachedStatus {
  authenticated: boolean;
  checkedAt: number;
}

const CACHE_KEY_PREFIX = "workflows-auth-status";

export function baseGatewayUrl(gatewayUrl?: string): string {
  const base = gatewayUrl ?? window.location.origin;
  return base.replace(/\/+$/, "").replace(/\/auth(\/(login|status))?$/, "");
}

export async function fetchAuthStatus({
  accessToken,
  gatewayUrl,
  signal,
}: AuthStatusRequest): Promise<boolean> {
  const response = await fetch(`${baseGatewayUrl(gatewayUrl)}/auth/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return response.ok ? ((await response.json()) as boolean) : false;
}

export function buildLoginUrl(returnTo?: string, gatewayUrl?: string): string {
  const loginUrl = new URL(`${baseGatewayUrl(gatewayUrl)}/auth/login`);
  if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
  return loginUrl.toString();
}

function hash(value: string): string {
  let result = 5381;
  for (let i = 0; i < value.length; i++) {
    result = (result * 33) ^ value.charCodeAt(i);
  }
  return (result >>> 0).toString(36);
}

export function authStatusCacheKey(
  accessToken: string,
  gatewayUrl?: string,
): string {
  const scope = `${baseGatewayUrl(gatewayUrl)}|${accessToken}`;
  return `${CACHE_KEY_PREFIX}:${hash(scope)}`;
}

export function readAuthStatusCache(
  cacheKey: string,
  ttlMs: number,
): boolean | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedStatus;
    if (Date.now() - cached.checkedAt > ttlMs) return null;
    return cached.authenticated;
  } catch {
    return null;
  }
}

export function writeAuthStatusCache(
  cacheKey: string,
  authenticated: boolean,
): void {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        authenticated,
        checkedAt: Date.now(),
      } satisfies CachedStatus),
    );
  } catch {
    // sessionStorage may be unavailable or full; caching is best-effort
  }
}
