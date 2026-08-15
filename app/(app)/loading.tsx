import { Skeleton } from "@/components/ui/skeleton";

/**
 * Group-level fallback for the (app) routes.
 *
 * Its job is to let the shell — sidebar, header, mobile tab bar — paint while
 * the route's data resolves, instead of the whole group blocking on it. Routes
 * that want something closer to their real layout add their own loading.tsx,
 * which takes precedence over this one.
 *
 * Deliberately generic: a page title and a few blocks. Anything more specific
 * would be wrong on five of the six routes.
 */
export default function AppGroupLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <Skeleton className="h-9 w-48" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
