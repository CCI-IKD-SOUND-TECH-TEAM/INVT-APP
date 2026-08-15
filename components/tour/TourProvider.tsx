"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "@/lib/session";
import { completeTour } from "@/app/actions/tour";

const TourRunner = dynamic(() => import("./TourRunner"), { ssr: false });

const TourContext = createContext<{ startTour: () => void } | null>(null);

/**
 * Owns tour lifecycle and persistence. Mounts once in the (app) layout —
 * inside SidebarProvider (for useSidebar) and StoreProvider (for the user id)
 * — so client-side navigation never remounts it mid-tour.
 *
 * Persistence is two-layered: `profiles.tour_completed_at` is the source of
 * truth (drives `autoStart`, follows the user across devices); localStorage
 * is the per-device guard that keeps a failed DB write from re-nagging, with
 * a retry on the next visit. Keys are scoped by user id because church staff
 * share machines.
 */
export default function TourProvider({
  autoStart,
  children,
}: {
  /** True when the profile row has no tour_completed_at stamp. */
  autoStart: boolean;
  children: React.ReactNode;
}) {
  const currentUser = useSession();
  const { isMobile, setOpen } = useSidebar();
  const [active, setActive] = useState(false);
  const [session, setSession] = useState(0);
  const [runnerMobile, setRunnerMobile] = useState(false);
  const startedRef = useRef(false);

  // Read inside callbacks/timeouts so they always see the settled value —
  // useIsMobile only resolves after mount.
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  const doneKey = `invt.tour.done:${currentUser.id}`;
  const syncKey = `invt.tour.sync:${currentUser.id}`;

  const begin = useCallback(() => {
    const mobile = isMobileRef.current;
    // Expand a collapsed icon rail so the nav steps have visible labels.
    if (!mobile) setOpen(true);
    // Snapshot: TourRunner remounts per session and its steps array must not
    // change identity mid-run (that resets Joyride's internal store).
    setRunnerMobile(mobile);
    setSession((s) => s + 1);
    setActive(true);
  }, [setOpen]);

  // Auto-start for fresh profiles, once per mount.
  useEffect(() => {
    if (!autoStart || startedRef.current) return;

    let done = false;
    try {
      done = localStorage.getItem(doneKey) === "1";
    } catch {
      // localStorage unavailable (private mode) — fall through to the tour.
    }
    if (done) {
      // This device finished the tour but the DB write failed — heal quietly.
      completeTour().catch(() => {});
      return;
    }

    // startedRef flips inside the timer, not before it: StrictMode's
    // mount/unmount/mount cycle clears the first timer, and flipping early
    // would stop the second mount from ever starting the tour.
    const timer = setTimeout(() => {
      startedRef.current = true;
      begin();
    }, 800); // let the shell render/settle before spotlighting
    return () => clearTimeout(timer);
  }, [autoStart, begin, doneKey]);

  // Retry a completion the server never saw (offline finish, failed action).
  useEffect(() => {
    let pending = false;
    try {
      pending = localStorage.getItem(syncKey) === "1";
    } catch {
      return;
    }
    if (!pending) return;
    completeTour()
      .then((res) => {
        if (res.ok) localStorage.removeItem(syncKey);
      })
      .catch(() => {});
  }, [syncKey]);

  const markComplete = useCallback(() => {
    setActive(false);
    // Local guard first, synchronously — a hard refresh mid-write must not
    // restart the tour.
    try {
      localStorage.setItem(doneKey, "1");
    } catch {}
    completeTour()
      .then((res) => {
        if (!res.ok) throw new Error(res.error);
        try {
          localStorage.removeItem(syncKey);
        } catch {}
      })
      .catch((err) => {
        console.error("[tour] completion sync failed", err);
        try {
          localStorage.setItem(syncKey, "1");
        } catch {}
      });
  }, [doneKey, syncKey]);

  const value = useMemo(() => ({ startTour: begin }), [begin]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourRunner
          key={session}
          isMobile={runnerMobile}
          onDone={markComplete}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
}
