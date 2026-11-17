export function baseGatewayUrl(gatewayUrl?: string): string {
  const base = gatewayUrl ?? window.location.origin;
  return base.replace(/\/+$/, "").replace(/\/auth(\/(login|status))?$/, "");
}

export function buildLoginUrl(returnTo?: string, gatewayUrl?: string): string {
  const loginUrl = new URL(`${baseGatewayUrl(gatewayUrl)}/auth/login`);
  if (returnTo) loginUrl.searchParams.set("returnTo", returnTo);
  return loginUrl.toString();
}
