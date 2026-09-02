import { Suspense } from "react";
import { MarketplaceClient } from "@/features/public/MarketplaceClient";
import { RaeiPublicShell } from "@/features/public/RaeiPublicShell";

export const metadata = {
  title: "العقارات",
};

export default function MarketplacePage() {
  return (
    <RaeiPublicShell>
      <Suspense fallback={null}>
        <MarketplaceClient />
      </Suspense>
    </RaeiPublicShell>
  );
}
