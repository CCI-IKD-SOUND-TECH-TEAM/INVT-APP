/**
 * The client-side fetcher every queryFn goes through.
 *
 * Server prefetches never come through here — an RSC calls the lib/data
 * function directly rather than making an HTTP request to its own route.
 */

/** Thrown for any non-OK response so React Query can distinguish failures. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(url, { signal, credentials: "same-origin" });

  if (res.status === 401) {
    // The session expired mid-visit. proxy.ts answers /api with a 401 rather
    // than redirecting, precisely so we can handle it here instead of trying
    // to JSON.parse a login page. Full navigation, not router.push — the
    // whole client cache is stale once the session is gone.
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

/** Builds a query string, dropping empty values so keys stay canonical. */
export function toSearchParams(
  input: Record<string, string | number | boolean | string[] | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
