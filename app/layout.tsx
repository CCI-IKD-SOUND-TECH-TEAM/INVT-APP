import type { Metadata } from "next";
import { Anton, Lato } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CCI Ikorodu Inventory",
  description: "Church asset inventory, defect, and repair tracking for CCI Ikorodu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(anton.variable, lato.variable, "font-sans")}>
      <body>{children}</body>
    </html>
  );
}
