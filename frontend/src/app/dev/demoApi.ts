/*
 * Demo build: drop-in replacement for `app/services/api.ts`.
 *
 * `npm run build:demo` aliases the real client to this file (see the
 * `resolve.alias` block in vite.config.ts). Same `api` surface, but every call
 * is answered in memory by demoFixtures.route() instead of hitting the network.
 *
 * The real client's contract is preserved: non-2xx responses throw an `Error`
 * carrying the server message, 204 returns `{}`, unparsable bodies return `{}`.
 */
import { demoRoute } from "./demoFixtures";

async function demoFetch(endpoint: string, options: RequestInit = {}) {
  // A small delay keeps spinners and loading states honest instead of flashing.
  await new Promise((resolve) => setTimeout(resolve, 120));

  const method = (options.method ?? "GET").toUpperCase();
  const url = new URL(endpoint, "http://demo.local");
  let body: unknown;
  if (typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = undefined;
    }
  }

  const { status, payload } = demoRoute(
    method,
    url.pathname,
    url.searchParams,
    body,
  );

  if (status < 200 || status >= 300) {
    if (status === 401) console.warn("Sesi berakhir (401 Unauthorized).");
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Error server (${status})`;
    throw new Error(message);
  }

  if (status === 204) return {};
  return payload ?? {};
}

export const api = {
  get: (endpoint: string, options?: RequestInit) =>
    demoFetch(endpoint, { ...options, method: "GET" }),

  post: (endpoint: string, body: any = {}, options?: RequestInit) =>
    demoFetch(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: (endpoint: string, body: any = {}, options?: RequestInit) =>
    demoFetch(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),



  delete: (endpoint: string, body: any = {}, options?: RequestInit) =>
    demoFetch(endpoint, {
      ...options,
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};
