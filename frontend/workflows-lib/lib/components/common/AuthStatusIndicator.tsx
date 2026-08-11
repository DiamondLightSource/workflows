import CircleIcon from "@mui/icons-material/Circle";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useAuthStatus } from "../../hooks/useAuthStatus";
import { buildLoginUrl } from "../../utils/authUtils";

export interface AuthStatusIndicatorProps {
  accessToken?: string;
  /** Defaults to the current origin, where the gateway is served under `/auth`. */
  gatewayUrl?: string;
  cacheTtlMs?: number;
  size?: number;
  returnTo?: string;
}

const AuthStatusIndicator = ({
  accessToken,
  gatewayUrl,
  cacheTtlMs,
  size = 20,
  returnTo,
}: AuthStatusIndicatorProps) => {
  const { authenticated } = useAuthStatus({
    accessToken,
    gatewayUrl,
    cacheTtlMs,
  });

  const handleClick = () => {
    if (authenticated) return;
    window.open(
      buildLoginUrl(returnTo, gatewayUrl),
      "_blank",
      "noopener,noreferrer",
    );
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
