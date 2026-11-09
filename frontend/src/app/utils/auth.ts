export const AUTH_TOKEN_KEY = "auth_token";

/** All localStorage keys that belong to the signed-in identity. */
export const AUTH_STORAGE_KEYS = [
  AUTH_TOKEN_KEY,
  "user_role",
  "user_name",
  "user_email",
  "user_id",
] as const;

// Wipe token + cached identity so RBAC checks can't read a stale role.
export const clearAuthStorage = (): void => {
  try {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage can throw when storage is disabled.
  }
};

// Read the raw auth token from localStorage.
export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    // localStorage can throw in private mode / disabled storage.
    return null;
  }
};

export interface JwtPayload {
  exp?: number;
  role?: string;
  [claim: string]: unknown;
}

// Decode a JWT payload without verifying its signature.
export const decodeJwtPayload = (token: string | null): JwtPayload | null => {
  if (!token) {
    return null;
  }
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
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
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
