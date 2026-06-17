const AUTH_TOKEN_KEY = "fleet_auth_token";

/** True in the browser; false during TanStack Start SSR. */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getWsUrlWithToken(baseUrl: string, token: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
