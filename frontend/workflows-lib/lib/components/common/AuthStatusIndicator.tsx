import { useEffect, useState } from "react";
import CircleIcon from "@mui/icons-material/Circle";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";

export interface AuthStatusIndicatorProps {
  gatewayUrl: string;
  accessToken?: string;
  cacheTtlMs?: number;
  size?: number;
  returnTo?: string;
}

interface CachedStatus {
  authenticated: boolean;
  checkedAt: number;
}

const CACHE_KEY = "workflows-auth-status";

const readCache = (ttlMs: number): boolean | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedStatus;
    if (Date.now() - cached.checkedAt > ttlMs) return null;
    return cached.authenticated;
  } catch {
    return null;
  }
};

const writeCache = (authenticated: boolean) => {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        authenticated,
        checkedAt: Date.now(),
      } satisfies CachedStatus),
    );
  } catch {
    // best-effort; ignore storage failures (e.g. private browsing)
  }
};

const AuthStatusIndicator = ({
  gatewayUrl,
  accessToken,
  cacheTtlMs = 30000,
  size = 20,
  returnTo,
}: AuthStatusIndicatorProps) => {
  const [status, setStatus] = useState<boolean | null>(() =>
    readCache(cacheTtlMs),
  );

  useEffect(() => {
    if (readCache(cacheTtlMs) !== null || !accessToken) return;

    let active = true;
    void fetch(`${gatewayUrl}/auth/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? (res.json() as Promise<boolean>) : false))
      .then((result) => {
        if (!active) return;
        setStatus(result);
        writeCache(result);
      })
      .catch(() => {
        if (active) setStatus(false);
      });

    return () => {
      active = false;
    };
  }, [gatewayUrl, accessToken, cacheTtlMs]);

  const authenticated = accessToken ? (status ?? false) : false;

  const handleClick = () => {
    if (authenticated) return;
    const loginUrl = new URL(`${gatewayUrl}/auth/login`);
    if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
    window.location.href = loginUrl.toString();
  };

  const text = authenticated
    ? "Workflows Authenticated"
    : "Workflows Unauthenticated";
  const tooltip = authenticated ? text : `${text} — click to log in`;

  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={handleClick}
        aria-label={tooltip}
        data-testid="auth-status-indicator"
        size="small"
        disableRipple={authenticated}
        sx={{
          cursor: authenticated ? "default" : "pointer",
          border: "1px solid",
          borderColor: "primary.main",
          borderRadius: 1,
          px: 1.5,
          py: 0.5,
          bgcolor: "primary.main",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CircleIcon
            sx={{
              fontSize: size,
              color: authenticated ? "success.main" : "grey.500",
            }}
          />
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ color: "common.white" }}
          >
            {text}
          </Typography>
        </Stack>
      </IconButton>
    </Tooltip>
  );
};

export default AuthStatusIndicator;
