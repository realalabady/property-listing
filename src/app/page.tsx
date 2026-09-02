import type { Metadata } from "next";
import { RaeiHomepage } from "@/features/landing/RaeiHomepage";

export const metadata: Metadata = {
  title: "راعي | ابحث عن عقارك التالي في السعودية",
  description:
    "راعي منصة عقارية سعودية بسيطة وموثوقة — ابحث في آلاف العقارات للبيع والإيجار في جميع مدن المملكة وتواصل مباشرة مع الشركات العقارية.",
};

export default function HomePage() {
  return <RaeiHomepage />;
}
