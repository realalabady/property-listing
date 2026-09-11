import type { Metadata } from "next";
import { RaeiHomepage } from "@/features/landing/RaeiHomepage";
import { getPricingVisible } from "@/lib/plans/catalog";

export const metadata: Metadata = {
  title: "راعي | ابحث عن عقارك التالي في السعودية",
  description:
    "راعي منصة عقارية سعودية بسيطة وموثوقة — ابحث في آلاف العقارات للبيع والإيجار في جميع مدن المملكة وتواصل مباشرة مع الشركات العقارية.",
};

// The plans link follows the admin's show/hide switch, so read it per request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <RaeiHomepage pricingVisible={await getPricingVisible()} />;
}
