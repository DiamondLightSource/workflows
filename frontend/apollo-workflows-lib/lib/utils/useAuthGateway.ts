declare global {
  interface Window {
    __USE_AUTH_GATEWAY__?: string;
  }
}

export function getUseAuthGateway(): boolean {
  // First check state that can only be determined at run-time
  // This is neccessary to prevent dead code elimination
  // removing some branches at build time
  // Ensures that the value can be reliably set in the container at runtime
  // via configure.sh
  const runtimeValue = window.__USE_AUTH_GATEWAY__;

  if (
    runtimeValue !== undefined &&
    runtimeValue !== "" &&
    !runtimeValue.includes("{{") // during local development, it still has its placeholder value
  ) {
    return runtimeValue.trim().toLowerCase() === "true";
  }

  // Fall-back for local development
  // To keep behaviour during local development, use vite build time parameters
  // As this can be evaluated at build time it could result in dead code elimination
  // if the above lines were removed
  return import.meta.env.VITE_USE_AUTH_GATEWAY === "true";
}
