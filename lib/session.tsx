"use client";

import { createContext, useContext, useMemo } from "react";
import type { SessionUser } from "@/lib/types";

/**
 * The signed-in staff member, and nothing else.
 *
 * Split out of the old client store so the app shell — sidebar avatar, tour
 * persistence keys — can identify the user without a data provider above it.
 * That is what let the layout stop fetching the whole database on every
 * navigation.
 *
 * Resolved server-side in app/(app)/layout.tsx from the verified JWT claims,
 * so it is one small prop rather than a query.
 */
const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  currentUser,
  children,
}: {
  currentUser: SessionUser;
  children: React.ReactNode;
}) {
  // The object identity is stable across renders as long as the fields are —
  // consumers of this context re-render on nothing else.
  const value = useMemo(
    () => currentUser,
    [currentUser.id, currentUser.full_name, currentUser.email] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionUser {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
