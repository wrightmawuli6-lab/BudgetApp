function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const DEFAULT_API_BASE_URL = "https://budgetapp-production-5add.up.railway.app";

export function stripApiSuffix(value: string): string {
  return stripTrailingSlash(value.trim()).replace(/\/api$/i, "");
}

export function resolveApiBaseUrl(configuredBaseUrl?: string): string {
  const explicitBaseUrl = configuredBaseUrl?.trim();
  const normalizedExplicitBaseUrl = explicitBaseUrl ? stripApiSuffix(explicitBaseUrl) : "";

  if (normalizedExplicitBaseUrl) {
    return normalizedExplicitBaseUrl;
  }

  return DEFAULT_API_BASE_URL;
}

export function buildApiRoot(baseUrl: string): string {
  return `${stripApiSuffix(baseUrl)}/api`;
}

export function getApiErrorMessage(error: any, fallbackMessage: string): string {
  const details = error?.response?.data?.error?.details;
  const detailMessage =
    Array.isArray(details) && details.length > 0
      ? details.map((detail: { message?: string }) => detail?.message).filter(Boolean).join(", ")
      : undefined;

  if (detailMessage) {
    return detailMessage;
  }

  const serverMessage = error?.response?.data?.error?.message;
  if (error?.code === "ERR_NETWORK" || error?.message === "Network Error" || (error?.request && !error?.response)) {
    const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
    return `Network error: couldn't reach the app API at ${apiBaseUrl}. Make sure your backend is running or set VITE_API_BASE_URL.`;
  }

  return serverMessage || fallbackMessage;
}
