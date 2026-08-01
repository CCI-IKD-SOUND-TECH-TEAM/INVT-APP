import type { Step } from "react-joyride";

/**
 * Poll for a selector until it appears with a settled bounding rect, or the
 * timeout lapses. The rect-stability check matters for targets inside the
 * mobile sheet, which slides in — spotlighting mid-animation would leave the
 * tooltip anchored to a stale position. Resolving on timeout is fine:
 * Joyride still runs its own target wait (targetWaitTimeout) and, in
 * uncontrolled mode, auto-advances past a target that never shows up.
 */
function waitForTarget(selector: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let lastRect = "";
    const poll = setInterval(() => {
      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(poll);
        resolve();
        return;
      }
      const el = document.querySelector(selector);
      if (!el) {
        lastRect = "";
        return;
      }
      const r = el.getBoundingClientRect();
      const key = `${r.x},${r.y},${r.width},${r.height}`;
      if (key === lastRect && r.width > 0) {
        clearInterval(poll);
        resolve();
      } else {
        lastRect = key;
      }
    }, 100);
  });
}

/** Sidebar nav steps — walked on both desktop and (inside the sheet) mobile. */
const NAV_STEPS = [
  {
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    content:
      "Your at-a-glance view: item counts, open defects, and how this week's checks are going.",
  },
  {
    target: '[data-tour="nav-inventory"]',
    title: "Inventory",
    content:
      "The full equipment register. Search, filter, and manage every item the church owns.",
  },
  {
    target: '[data-tour="nav-defects"]',
    title: "Defect Log",
    content:
      "Report faults here and track each repair from first report to resolution.",
  },
  {
    target: '[data-tour="nav-checks"]',
    title: "Weekly Checks",
    content:
      "Setup and set-down checks confirm equipment is present and working, week after week.",
  },
  {
    target: '[data-tour="nav-reports"]',
    title: "Reports",
    content: "Trends and summaries you can review or share with leadership.",
  },
  {
    target: '[data-tour="nav-settings"]',
    title: "Settings",
    content: "Categories, units of measure, and staff accounts live here.",
  },
];

export function buildTourSteps({
  isMobile,
  push,
  setOpenMobile,
}: {
  isMobile: boolean;
  push: (href: string) => void;
  setOpenMobile: (open: boolean) => void;
}): Step[] {
  /**
   * `before` hook for steps whose target lives on another page: close the
   * mobile sheet (no-op on desktop), navigate, then hold the tour until the
   * target renders. Reads location.pathname directly (not usePathname) so
   * the check is always current — these hooks are built once per session.
   */
  const goTo =
    (route: string, selector: string) => async (): Promise<void> => {
      setOpenMobile(false);
      if (window.location.pathname !== route) push(route);
      await waitForTarget(selector, 4000);
    };

  /**
   * Mobile nav steps live inside the off-canvas sheet: open it and wait for
   * the link to finish sliding in. TourRunner holds mobileSheetLocked while
   * the tour runs, so the non-modal sheet can't dismiss itself under us.
   */
  const openNavSheet = (selector: string) => async (): Promise<void> => {
    setOpenMobile(true);
    await waitForTarget(selector, 4000);
  };

  const navSteps: Step[] = isMobile
    ? [
        {
          target: '[data-tour="sidebar-trigger"]',
          placement: "bottom",
          title: "Navigation",
          content:
            "This button opens the menu. Let's take a quick look at what's inside.",
          // PREV from the first nav step lands here — put the sheet away so
          // the trigger is visible again.
          before: async () => {
            setOpenMobile(false);
          },
        },
        ...NAV_STEPS.map((step) => ({
          ...step,
          placement: "bottom" as const,
          before: openNavSheet(step.target),
        })),
      ]
    : NAV_STEPS.map((step) => ({ ...step, placement: "right" as const }));

  return [
    {
      target: "body",
      placement: "center",
      title: "Welcome to CCI Ikorodu Inventory app",
      content:
        "A quick tour of where things live — it takes under a minute, and you can skip at any time.",
    },
    ...navSteps,
    {
      target: '[data-tour="add-item"]',
      placement: "bottom",
      title: "Add equipment",
      content:
        "New gear starts here. Give it a name, category, and department, and it's tracked from day one.",
      before: goTo("/inventory", '[data-tour="add-item"]'),
    },
    {
      target: '[data-tour="start-check"]',
      placement: "top",
      title: "Run a weekly check",
      content: "Pick a department and start its setup or set-down check here.",
      before: goTo("/checks", '[data-tour="start-check"]'),
    },
  ];
}
