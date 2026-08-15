/**
 * TEMPORARY visual/overflow verification harness — delete after use.
 *
 * Lives under /login/* because that is the only path the auth proxy lets
 * through without a session. Mounts the REAL page components inside the real
 * StoreProvider + AppShell against a fixture, so overflow measured here is
 * overflow the signed-in app would have.
 *
 *   /login/preview?screen=checks
 */
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { StoreProvider } from "@/lib/store";
import { SessionProvider } from "@/lib/session";
import { CURRENT_USER, SEED } from "./fixture";
import { usePreviewCache } from "./seed-cache";

// Migrated screens are mounted as their client half — the `page.tsx` above
// them is now a server component that prefetches, and a client harness cannot
// import one. usePreviewCache() populates the query cache those clients read,
// so the fixture still drives the render.
import DashboardClient from "@/app/(app)/dashboard/DashboardClient";
// Each route's `page.tsx` is now a server wrapper; the harness mounts the
// client half directly.
import InventoryPage from "@/app/(app)/inventory/InventoryClient";
import DefectsPage from "@/app/(app)/defects/DefectsClient";
import ChecksPage from "@/app/(app)/checks/ChecksClient";
import SettingsPage from "@/app/(app)/settings/SettingsClient";
import ReportsPage from "@/app/(app)/reports/ReportsClient";

const SCREENS: Record<string, React.ComponentType> = {
  dashboard: DashboardClient,
  inventory: InventoryPage,
  defects: DefectsPage,
  checks: ChecksPage,
  settings: SettingsPage,
  reports: ReportsPage,
};

/** Reports every element whose right edge crosses the viewport. */
function OverflowProbe() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      const NL = String.fromCharCode(10);
      function run() {
        const vw = document.documentElement.clientWidth;
        const out = [];
        document.querySelectorAll('body *').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width === 0) return;
          if (r.right > vw + 1 || r.left < -1) {
            // Ignore anything inside a horizontal scroller — that overflow
            // is contained by design.
            let p = el.parentElement, scoped = false;
            while (p && p !== document.body) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { scoped = true; break; }
              p = p.parentElement;
            }
            if (!scoped) out.push(Math.round(r.left) + '..' + Math.round(r.right) + ' ' +
              el.tagName + '.' + (el.className.baseVal ?? el.className).toString().slice(0, 60));
          }
        });
        const p = document.createElement('pre');
        p.id = 'probe';
        p.setAttribute('style','position:fixed;top:0;left:0;z-index:9999;background:#fff;color:#000;font:10px monospace;margin:0;padding:2px;max-width:100%');
        p.textContent = 'vw=' + vw + ' scrollW=' + document.documentElement.scrollWidth +
          ' overflow=' + (document.documentElement.scrollWidth > vw ? 'YES' : 'no') +
          (out.length ? NL + out.slice(0, 8).join(NL) : '');
        document.body.prepend(p);
      }
      window.addEventListener('load', () => setTimeout(run, 900));`,
      }}
    />
  );
}

function PreviewInner() {
  const params = useSearchParams();
  const key = params.get("screen") ?? "dashboard";
  const Screen = SCREENS[key] ?? DashboardClient;

  // Fills the React Query cache from the same fixture the store gets, so
  // migrated and un-migrated screens render from one source of truth.
  usePreviewCache();

  return (
    <SessionProvider currentUser={CURRENT_USER}>
      <StoreProvider seed={SEED}>
        <OverflowProbe />
        <AppShell>
          <Screen />
        </AppShell>
      </StoreProvider>
    </SessionProvider>
  );
}

export default function Preview() {
  return (
    <Suspense>
      <PreviewInner />
    </Suspense>
  );
}
