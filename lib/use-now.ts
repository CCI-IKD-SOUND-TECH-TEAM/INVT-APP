"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * The current time, ticking, and `null` until the browser has mounted.
 *
 * The null first frame is the point. The dashboard header prints today's date,
 * the countdown to Sunday, and "updated N min ago" — all of which the server
 * would render in UTC while the user reads them in UTC+1, and all of which can
 * cross a minute boundary between the server render and hydration. Rendering
 * nothing until mount is cheaper than reconciling a mismatch, and the loading
 * skeleton already reserves the line so nothing jumps.
 *
 * The clock is an external system, so it is subscribed to rather than mirrored
 * into state by an effect: `useSyncExternalStore` is the React-sanctioned shape
 * for this and avoids the cascading render an effect-plus-setState causes. The
 * snapshot is a number so it stays referentially stable between ticks.
 *
 * One minute is the finest granularity anything here displays.
 */
export function useNow(intervalMs = 60_000): Date | null {
  const snapshot = useRef<number | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      snapshot.current = Date.now();
      onStoreChange();
      const id = setInterval(() => {
        snapshot.current = Date.now();
        onStoreChange();
      }, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs]
  );

  const ms = useSyncExternalStore(
    subscribe,
    () => snapshot.current,
    () => null
  );

  return ms === null ? null : new Date(ms);
}
