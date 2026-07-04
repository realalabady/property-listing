import { CompanyListingDetailClient } from "@/features/public/CompanyListingDetailClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

export const metadata = {
  title: "عقار الشركة",
};

export default async function CompanyListingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return (
    <DarPublicShell>
      <CompanyListingDetailClient slug={slug} listingId={id} />
    </DarPublicShell>
  );
}
