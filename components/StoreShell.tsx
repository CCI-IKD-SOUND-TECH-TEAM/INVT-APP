import { getStoreData } from "@/lib/data/inventory";
import { StoreProvider } from "@/lib/store";

/**
 * TRANSITIONAL — deleted at the end of the read-layer migration.
 *
 * The full-database fetch used to live in app/(app)/layout.tsx, which meant
 * every route paid for it including the ones that need six numbers. It now
 * lives here, and only the routes that still read the client store mount it.
 * A migrated route renders its own prefetched queries and never touches this.
 *
 * Each remaining consumer therefore pays exactly what it paid before — no
 * worse — while the migrated ones stop paying entirely. When the last page
 * moves off `useStore()`, this file and lib/store.tsx go together.
 */
export default async function StoreShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const seed = await getStoreData();

  return <StoreProvider seed={seed}>{children}</StoreProvider>;
}
