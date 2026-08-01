"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconArchive as ArchiveBoxIcon, IconLogout as ArrowRightStartOnRectangleIcon, IconClipboardCheck as ClipboardDocumentCheckIcon, IconSettings as Cog6ToothIcon, IconReportAnalytics as DocumentChartBarIcon, IconLayoutDashboard as Squares2X2Icon, IconTool as WrenchScrewdriverIcon } from "@tabler/icons-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Squares2X2Icon },
  { href: "/inventory", label: "Inventory", icon: ArchiveBoxIcon },
  { href: "/defects", label: "Defect Log", icon: WrenchScrewdriverIcon },
  { href: "/checks", label: "Weekly Checks", icon: ClipboardDocumentCheckIcon },
  { href: "/reports", label: "Reports", icon: DocumentChartBarIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { currentUser } = useStore();
  const collapsed = state === "collapsed" && !isMobile;
  const [loggingOut, setLoggingOut] = useState(false);

  // signOut clears the Supabase session server-side and redirects. The old
  // version only navigated, which left the session intact — the proxy would
  // have bounced the user straight back to /dashboard. Stay in the loading
  // state through the redirect — no need to reset on success.
  async function logout() {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group-data-[collapsible=icon]:p-2">
        <Link
          href="/dashboard"
          onClick={() => setOpenMobile(false)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-1 py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
            collapsed && "justify-center gap-0 px-0"
          )}
        >
          <Image
            src="/logo.jpg"
            alt="CCI Ikorodu"
            width={96}
            height={96}
            className={cn(
              "shrink-0 rounded-full object-cover",
              collapsed ? "size-9" : "size-12"
            )}
          />
          <span
            className={cn(
              "flex flex-col leading-tight transition-opacity duration-150",
              collapsed && "hidden"
            )}
          >
            <span className="font-display text-[0.95rem] tracking-wide">
              Ikorodu Inventory
            </span>
            <span className="text-[0.6875rem] text-ink-faint">
              Asset Management
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href) ?? false;
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <Icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "ml-auto size-1.5 rounded-full bg-brand transition-opacity duration-150 group-data-[collapsible=icon]:hidden",
                          active ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md border border-sidebar-border p-2.5",
            collapsed && "justify-center border-transparent p-0"
          )}
        >
          <Avatar>
            <AvatarFallback>{initials(currentUser.full_name)}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "flex min-w-0 flex-col leading-tight",
              collapsed && "hidden"
            )}
          >
            <span className="truncate text-[0.8125rem] font-bold">
              {currentUser.full_name}
            </span>
            <span className="text-xs text-ink-faint">Church Staff</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "ml-auto shrink-0 text-ink-faint hover:bg-brand-tint hover:text-brand",
              collapsed && "hidden"
            )}
            aria-label="Log out"
            loading={loggingOut}
            onClick={logout}
          >
            <ArrowRightStartOnRectangleIcon className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
