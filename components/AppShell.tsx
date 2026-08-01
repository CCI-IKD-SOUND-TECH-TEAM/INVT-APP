"use client";

import AppSidebar from "@/components/AppSidebar";
import SiteHeader from "@/components/SiteHeader";
import TourProvider from "@/components/tour/TourProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppShell({
  children,
  tourAutoStart = false,
}: {
  children: React.ReactNode;
  /** True when the signed-in profile hasn't completed the onboarding tour. */
  tourAutoStart?: boolean;
}) {
  return (
    <SidebarProvider>
      {/* TourProvider sits inside SidebarProvider — it uses useSidebar(). */}
      <TourProvider autoStart={tourAutoStart}>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
        </SidebarInset>
      </TourProvider>
    </SidebarProvider>
  );
}
