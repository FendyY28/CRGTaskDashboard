
import { API_URL } from "../../lib/utils";
import { clearAuthStorage, getAuthToken } from "../utils/auth";

/** Event dispatched so the app can react (clear state, redirect) instead of
 *  every caller handling an expired session on its own. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export interface ApiErrorOptions {
  status: number;
  endpoint: string;
  /** Parsed JSON body when available, otherwise the raw response text. */
  body?: unknown;
}

/** Error thrown for non-2xx responses; keeps the status and payload available. */
export class ApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body?: unknown;

  constructor(message: string, { status, endpoint, body }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.body = body;
  }
}

function handleUnauthorized(): void {
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

async function fetchWrapper<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  // Demo builds (npm run build:demo) replace this module with the in-memory
  // backend from src/app/dev/devFixtures.ts. See vite.config.ts.
  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    let errorMessage = `Error server (${response.status})`;
    let payload: unknown;
    try {
      payload = await response.json();
      const message = (payload as { message?: unknown } | null)?.message;
      if (typeof message === "string" && message) {
        errorMessage = message;
      } else if (Array.isArray(message) && message.length > 0) {
        errorMessage = message.map(String).join(", ");
      }
    } catch {
      // Body was not JSON — keep the raw text so callers can still inspect it.
      try {
        const text = await response.text();
        if (text) payload = text;
      } catch {
        // Response body already consumed or unreadable; ignore.
      }
    }
    throw new ApiError(errorMessage, {
      status: response.status,
      endpoint,
      body: payload,
    });
  }

  if (response.status === 204) return {} as T;

  try {
    return (await response.json()) as T;
  } catch (e) {
    return {} as T;
  }
}

// Identitas pelaku TIDAK lagi dikirim dari client. Backend mengambilnya dari
// JWT, sehingga audit trail tidak bisa dipalsukan lewat body request.

// Callers can pin the response shape (`api.get<Project[]>(...)`); when they
// don't, the result is `unknown` and must be narrowed before use.
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestInit) =>
    fetchWrapper<T>(endpoint, { ...options, method: "GET" }),

  post: <T = unknown>(
    endpoint: string,
    body: unknown = {},
    options?: RequestInit,
  ) =>
    fetchWrapper<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T = unknown>(
    endpoint: string,
    body: unknown = {},
    options?: RequestInit,
  ) =>
    fetchWrapper<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T = unknown>(
    endpoint: string,
    body: unknown = {},
    options?: RequestInit,
  ) =>
    fetchWrapper<T>(endpoint, {
      ...options,
      method: "DELETE",
      body: JSON.stringify(body),
    }),

  put: <T = unknown>(
    endpoint: string,
    body: unknown = {},
    options?: RequestInit,
  ) =>
    fetchWrapper<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
