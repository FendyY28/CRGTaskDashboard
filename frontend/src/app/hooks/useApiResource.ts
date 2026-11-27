import { useState, useEffect, useCallback, useRef } from "react";
import { api, type RequestOptions } from "../services/api";

export interface ApiResource<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Refetch the endpoint; also used as the `refresh` returned by the data hooks. */
  reload: (signal?: AbortSignal) => Promise<void>;
}

type Endpoint = string | readonly string[];

/**
 * Fetches one endpoint (or a group of them) from the API. */
type Fetcher<T> = (signal?: AbortSignal) => Promise<T>;

/**
 * Shared loading/error/AbortController lifecycle for one GET endpoint (or a
 * group of endpoints fetched in parallel).
 *
 * Only the response belonging to the most recent request is applied to state,
 * so an aborted or superseded request can never flip `loading`/`error` back.
 *
 * Pass a `fetcher` instead of `endpoint` when the data takes more than a few
 * plain GETs (e.g. a second request that depends on the first one's response);
 * the hook still owns abort/loading/error handling. `endpoint` is then ignored.
 */
export function useApiResource<T>(
  endpoint: Endpoint,
  initialData: T,
  fallbackError: string,
  normalize?: (raw: unknown) => T,
  fetcher?: Fetcher<T>,
): ApiResource<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Compare by value so an inline array literal does not restart the fetch on
  // every render.
  const endpoints: string[] = typeof endpoint === "string" ? [endpoint] : [...endpoint];
  const endpointsKey = JSON.stringify(endpoints);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      const isLatest = () => requestId === requestIdRef.current;

      setLoading(true);
      try {
        let result: T;
        if (fetcher) {
          result = await fetcher(signal);
        } else {
          const urls = JSON.parse(endpointsKey) as string[];
          const options: RequestOptions = { signal };
          const raw = await (urls.length === 1
            ? api.get(urls[0], options)
            : Promise.all(urls.map((url) => api.get(url, options))));
          result = normalize ? normalize(raw) : (raw as T);
        }
        if (!isLatest()) return;
        setData(result);
        setError(null);
        setLoading(false);
      } catch (err: unknown) {
        if (!isLatest()) return;
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : undefined;
        setError(message || fallbackError);
        setLoading(false);
      }
    },
    [endpointsKey, normalize, fallbackError, fetcher],
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => {
      // Invalidate any in-flight request so its result is ignored.
      requestIdRef.current += 1;
      controller.abort();
    };
  }, [reload]);

  return { data, loading, error, reload };
}
