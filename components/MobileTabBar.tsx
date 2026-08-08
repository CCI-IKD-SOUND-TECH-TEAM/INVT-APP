"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconArchive as ArchiveBoxIcon,
  IconLogout as ArrowRightStartOnRectangleIcon,
  IconClipboardCheck as ClipboardDocumentCheckIcon,
  IconSettings as Cog6ToothIcon,
  IconReportAnalytics as DocumentChartBarIcon,
  IconDots as EllipsisIcon,
  IconPlus as PlusIcon,
  IconLayoutDashboard as Squares2X2Icon,
  IconTool as WrenchScrewdriverIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom navigation (design handoff `1b`).
 *
 * Four equal tabs with a centre action button between Items and Checks. The
 * centre button is "Log a defect" — on desktop that lives in the dashboard
 * header where it scrolls out of reach.
 *
 * Cost of the four-slot pattern: Defect Log, Reports and Settings have no tab.
 * They live in the More sheet (and Defect Log is also linked from the
 * dashboard). Per the handoff, the active tab is carried by colour alone —
 * no dot, no top stripe, no background pill — so `aria-current` does the
 * non-visual work.
 *
 * Hidden from `md:` up, where AppSidebar takes over.
 */

const TABS = [
  { href: "/dashboard", label: "Home", icon: Squares2X2Icon },
  { href: "/inventory", label: "Items", icon: ArchiveBoxIcon },
] as const;

const TABS_AFTER = [
  { href: "/checks", label: "Checks", icon: ClipboardDocumentCheckIcon },
] as const;

const MORE_LINKS = [
  { href: "/defects", label: "Defect Log", icon: WrenchScrewdriverIcon },
  { href: "/reports", label: "Reports", icon: DocumentChartBarIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
] as const;

/** Height of the bar itself (6px top pad + 56px tab + 10px bottom pad). */
export const MOBILE_TAB_BAR_HEIGHT = "4.5rem";

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Squares2X2Icon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-bold tracking-[0.02em] transition-colors duration-150 active:bg-accent",
        active ? "text-foreground" : "text-ink-muted"
      )}
    >
      <Icon
        size={22}
        stroke={1.8}
        className={active ? "text-brand" : undefined}
      />
      {label}
    </Link>
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) => pathname?.startsWith(href) ?? false;
  const moreActive = MORE_LINKS.some((l) => isActive(l.href));

  async function logout() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line-subtle bg-surface-sunken px-1 pt-1.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {TABS.map((t) => (
          <Tab key={t.href} {...t} active={isActive(t.href)} />
        ))}

        {/* Centre action. Breaks the bar's top edge via the negative margin. */}
        <div className="flex w-15 shrink-0 justify-center">
          <Link
            href="/defects?log=1"
            aria-label="Log a defect"
            className="-mt-3.5 flex size-13 items-center justify-center rounded-full border-[3px] border-background bg-brand text-white transition-colors duration-150 active:bg-brand-deep"
          >
            <PlusIcon size={24} stroke={2.4} />
          </Link>
        </div>

        {TABS_AFTER.map((t) => (
          <Tab key={t.href} {...t} active={isActive(t.href)} />
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] font-bold tracking-[0.02em] transition-colors duration-150 active:bg-accent",
            moreActive ? "text-foreground" : "text-ink-muted"
          )}
        >
          <EllipsisIcon
            size={22}
            stroke={1.8}
            className={moreActive ? "text-brand" : undefined}
          />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {MORE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-bold transition-colors duration-150 active:bg-accent",
                  isActive(href) ? "text-foreground" : "text-ink-muted"
                )}
              >
                <Icon
                  size={20}
                  stroke={1.8}
                  className={isActive(href) ? "text-brand" : undefined}
                />
                {label}
              </Link>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="mt-1 justify-start px-3 text-ink-faint hover:bg-brand-tint hover:text-brand"
              loading={loggingOut}
              onClick={logout}
            >
              <ArrowRightStartOnRectangleIcon className="size-5" /> Log out
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
