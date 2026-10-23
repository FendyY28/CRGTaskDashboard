export const AUTH_TOKEN_KEY = "auth_token";

// Read the raw auth token from localStorage.
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // localStorage can throw in private mode / disabled storage.
    return null;
  }
};

// Decode a JWT payload without verifying its signature.
const decodeJwtPayload = (token: string): { exp?: number } | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
};

// True when a stored token exists and has not expired; opaque tokens count as valid.
export const hasValidAuthToken = (): boolean => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Not a JWT — cannot check expiry, so keep previous presence-based behaviour.
    return true;
  }

  if (typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp * 1000 > Date.now();
};
