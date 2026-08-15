import "server-only";

/**
 * Wraps a read function into a Response.
 *
 * The read layer in lib/data/* throws on failure so the RSC prefetch path can
 * let errors reach an error boundary. Route Handlers need the same failure to
 * become a status code instead — this is the one place that translation lives,
 * so every endpoint fails the same way.
 */
export async function respond<T>(read: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await read());
  } catch (error) {
    // Logged server-side with the real message; the client gets a generic one
    // so a Postgres error never leaks through the API.
    console.error("[api]", error);
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}

/** Parses a repeated or comma-separated query param into a string array. */
export function listParam(params: URLSearchParams, key: string): string[] {
  const all = params.getAll(key).flatMap((v) => v.split(","));
  return all.map((v) => v.trim()).filter(Boolean);
}

export function boolParam(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "true";
}

export function intParam(
  params: URLSearchParams,
  key: string,
  fallback: number
): number {
  const parsed = Number.parseInt(params.get(key) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
