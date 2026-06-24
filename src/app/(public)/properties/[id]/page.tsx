import { MarketplaceDetailClient } from "@/features/public/MarketplaceDetailClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

export const metadata = {
  title: "تفاصيل العقار",
};

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <DarPublicShell>
      <MarketplaceDetailClient listingId={id} />
    </DarPublicShell>
  );
}
