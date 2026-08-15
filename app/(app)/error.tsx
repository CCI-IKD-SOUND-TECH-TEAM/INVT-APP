"use client";

import { useEffect } from "react";
import { IconAlertTriangle as ExclamationTriangleIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/**
 * Catches throws from the server read layer (lib/data/*) and from render.
 *
 * The read functions throw rather than returning empty results on purpose: a
 * failed aggregate rendering as "0 assets" is indistinguishable from an empty
 * inventory. This is where that choice surfaces to the user.
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border px-4 py-16 text-center">
      <ExclamationTriangleIcon className="size-10 text-status-caution" />
      <h2 className="h-headline">Couldn&apos;t load this page</h2>
      <p className="max-w-prose text-muted-foreground">
        Something went wrong fetching the data. Your inventory is safe — this is
        a display problem, not a data one.
      </p>
      <Button onClick={reset}>Try again</Button>
      {error.digest && (
        <p className="text-xs text-ink-faint">Reference: {error.digest}</p>
      )}
    </div>
  );
}
