"use client";

import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
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
          {/* Below md: the bottom tab bar owns navigation, and each page
              renders its own display-size title — so the shared header (a
              hamburger plus a duplicate title) is desktop-only. */}
          <div className="hidden md:block">
            <SiteHeader />
          </div>
          {/* A div, not <main> — SidebarInset already renders the <main>.
              min-w-0 lets long/fixed-width children shrink instead of
              widening the page and creating a horizontal scroll (which also
              drags the fixed tab bar out of alignment). */}
          <div className="min-w-0 flex-1 px-4 pt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom)+1rem)] md:px-10 md:py-8">
            {children}
          </div>
        </SidebarInset>
        <MobileTabBar />
      </TourProvider>
    </SidebarProvider>
  );
}
