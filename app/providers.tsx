"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/query-client";

/**
 * Mounted in the root layout — above the (app) group — so /login and
 * /auth/confirm sit inside the same cache as the signed-in routes.
 *
 * getQueryClient() (not useState) is what keeps the browser client stable
 * across renders while still handing the server a fresh one per request.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Statically false in production, so the bundler drops the import. */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
