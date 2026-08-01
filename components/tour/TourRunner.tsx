"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EVENTS, useJoyride, type EventData } from "react-joyride";
import { useSidebar } from "@/components/ui/sidebar";
import { buildTourSteps } from "./steps";
import TourTooltip from "./TourTooltip";

/**
 * The actual Joyride instance. Mounted by TourProvider only while a tour is
 * running (and remounted per session via `key`), so starting is just `run:
 * true` on mount and no start/stop control juggling is needed. Loaded with
 * `ssr: false` so react-joyride stays out of the layout bundle for everyone
 * who never sees the tour.
 *
 * Uncontrolled mode on purpose: Joyride v3 advances itself, waits for targets
 * (targetWaitTimeout) after our `before` hooks navigate between pages, and
 * auto-skips a step whose target never appears — no stepIndex bookkeeping.
 */
export default function TourRunner({
  isMobile,
  onDone,
}: {
  /** Snapshot from tour start — the steps array must not change mid-run. */
  isMobile: boolean;
  /** Fired once on TOUR_END; finishing and skipping both land here. */
  onDone: () => void;
}) {
  const router = useRouter();
  const { setOpenMobile, setMobileSheetLocked } = useSidebar();

  // While the tour runs, the mobile sheet is non-modal and undismissable so
  // the nav steps can spotlight links inside it (see SidebarContextProps).
  // Cleanup restores normal sheet behavior and puts it away, however the
  // tour ended.
  useEffect(() => {
    setMobileSheetLocked(true);
    return () => {
      setMobileSheetLocked(false);
      setOpenMobile(false);
    };
  }, [setMobileSheetLocked, setOpenMobile]);

  const steps = useMemo(
    () => buildTourSteps({ isMobile, push: router.push, setOpenMobile }),
    [isMobile, router, setOpenMobile]
  );

  const { Tour } = useJoyride({
    run: true,
    continuous: true,
    steps,
    tooltipComponent: TourTooltip,
    onEvent: (data: EventData) => {
      if (data.type === EVENTS.TOUR_END) onDone();
    },
    options: {
      arrowColor: "#121214", // --card
      backgroundColor: "#121214", // --card
      overlayColor: "rgba(0, 0, 0, 0.72)",
      primaryColor: "#ff3b3b", // --brand
      textColor: "#f5f5f4", // --ink
      zIndex: 120, // above the sticky header (z-20) and mobile sheet (z-50)
      spotlightRadius: 12,
      scrollOffset: 96, // clear the sticky SiteHeader when scrolling to targets
      skipBeacon: true, // straight to the tooltip, no pulsing beacon phase
      targetWaitTimeout: 4000, // routed/sheet steps: wait for render + slide-in
      overlayClickAction: false,
      dismissKeyAction: false,
      blockTargetInteraction: true, // spotlighted links stay inert mid-tour
    },
  });

  return Tour;
}
