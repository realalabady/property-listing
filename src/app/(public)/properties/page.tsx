import { Suspense } from "react";
import { MarketplaceClient } from "@/features/public/MarketplaceClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

export const metadata = {
  title: "العقارات",
};

export default function MarketplacePage() {
  return (
    <DarPublicShell>
      <Suspense fallback={null}>
        <MarketplaceClient />
      </Suspense>
    </DarPublicShell>
  );
}
