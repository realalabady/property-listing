import type { Metadata } from "next";
import { PricingPage } from "@/features/landing/PricingPage";

export const metadata: Metadata = {
  title: "الباقات والأسعار",
  description:
    "باقات راعي للشركات العقارية: مبتدئ واحترافي ومؤسسات. قارن الحدود والمزايا واختر الباقة المناسبة لمكتبك.",
};

export default function PricingRoute() {
  return <PricingPage />;
}
