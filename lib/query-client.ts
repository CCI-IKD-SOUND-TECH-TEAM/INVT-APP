import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

/**
 * Shared QueryClient factory for both sides of the RSC boundary.
 *
 * Server: a fresh client per request, so one user's prefetched data can never
 * leak into another's render.
 * Browser: a single long-lived client, created lazily — making a new one on
 * every render would throw the cache away on each navigation.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Above zero so returning to a route serves cache instead of a
        // spinner. Reference data overrides this to an hour at the query.
        staleTime: 30_000,
        gcTime: 10 * 60_000,

        // Off deliberately. These users are on phones: every app-switch,
        // notification and screen-wake fires a focus event, and the default
        // would refetch every active query each time — from a device in
        // someone's pocket, on the building's wifi.
        refetchOnWindowFocus: false,

        // Reconnect is the one we do want — it's the "walked back into range"
        // case, which is common in a building with patchy coverage.
        refetchOnReconnect: true,

        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      dehydrate: {
        // Dehydrate still-pending queries too, so a page can kick off a fetch
        // without awaiting it and let the client pick up the same promise.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}
