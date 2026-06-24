import type { Metadata, Viewport } from "next";
import {
  Cairo,
  IBM_Plex_Sans_Arabic,
  Manrope,
  Tajawal,
} from "next/font/google";
import "./globals.css";
import { AuthBootstrap } from "@/components/providers/AuthBootstrap";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-tajawal",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-ibm-plex-arabic",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "دار — منصة العقارات الموثوقة في السعودية",
    template: "%s | دار",
  },
  description:
    "دار منصة عقارية سعودية بسيطة وموثوقة — ابحث في آلاف العقارات للبيع والإيجار في جميع مدن المملكة وتواصل مباشرة مع الشركات العقارية.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    siteName: "دار",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#08150f" },
    { media: "(prefers-color-scheme: dark)", color: "#06100b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${manrope.variable} ${tajawal.variable} ${ibmPlexArabic.variable} ${cairo.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
