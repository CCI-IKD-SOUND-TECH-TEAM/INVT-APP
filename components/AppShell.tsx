"use client";

import AppSidebar from "@/components/AppSidebar";
import SiteHeader from "@/components/SiteHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
