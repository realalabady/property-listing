import type { Metadata } from "next";
import { DarHomepage } from "@/features/landing/DarHomepage";

export const metadata: Metadata = {
  title: "دار | ابحث عن عقارك التالي في السعودية",
  description:
    "دار منصة عقارية سعودية بسيطة وموثوقة — ابحث في آلاف العقارات للبيع والإيجار في جميع مدن المملكة وتواصل مباشرة مع الشركات العقارية.",
};

export default function HomePage() {
  return <DarHomepage />;
}
