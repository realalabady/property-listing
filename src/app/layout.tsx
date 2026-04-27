import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthBootstrap } from "@/components/providers/AuthBootstrap";

export const metadata: Metadata = {
  title: {
    default: "RealEstateSaaS — Multi-Tenant Real Estate Platform",
    template: "%s | RealEstateSaaS",
  },
  description:
    "Launch your branded real estate website and run your entire operation — listings, leads, employees, KPIs — from one platform.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    siteName: "RealEstateSaaS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
