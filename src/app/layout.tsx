import type { Metadata, Viewport } from "next";
import {
  Cairo,
  IBM_Plex_Sans_Arabic,
  Manrope,
  Tajawal,
} from "next/font/google";
import "./globals.css";
import { AuthBootstrap } from "@/components/providers/AuthBootstrap";
import { CookieConsent } from "@/components/CookieConsent";

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
    default: "راعي — منصة العقارات الموثوقة في السعودية",
    template: "%s | راعي",
  },
  description:
    "راعي منصة عقارية سعودية بسيطة وموثوقة — ابحث في آلاف العقارات للبيع والإيجار في جميع مدن المملكة وتواصل مباشرة مع الشركات العقارية.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    siteName: "راعي",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser UI tint. Matches the Wazi light surface the app actually paints —
  // it used to be the legacy dark green, which read as a flash of the old brand
  // on load and coloured the mobile address bar off-brand.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#faf9fb" },
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
        <CookieConsent />
      </body>
    </html>
  );
}
