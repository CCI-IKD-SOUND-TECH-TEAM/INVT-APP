"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const NAV_LABELS: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/defects", label: "Defect Log" },
  { href: "/checks", label: "Weekly Checks" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const activeLabel =
    NAV_LABELS.find((n) => pathname?.startsWith(n.href))?.label ??
    "CCI Ikorodu";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line-subtle bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <SidebarTrigger
        data-tour="sidebar-trigger"
        className="-ml-1.5 text-muted-foreground"
      />
      <Separator orientation="vertical" className="h-5" />
      <span className="h-title">{activeLabel}</span>
    </header>
  );
}
