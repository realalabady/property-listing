import type { Metadata } from "next";
import { PartnerRequestForm } from "@/features/landing/PartnerRequestForm";

export const metadata: Metadata = {
  title: "راعي | انضم كشريك",
  description:
    "سجّل شركتك العقارية في منصة راعي: أرسل بيانات الشركة والسجل التجاري وسنتواصل معك لإنشاء حساب الشركة.",
};

export default function PartnerPage() {
  return <PartnerRequestForm />;
}
