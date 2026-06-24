import { CompanyListingDetailClient } from "@/features/public/CompanyListingDetailClient";

export const metadata = {
  title: "عقار الشركة",
};

export default async function CompanyListingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  return <CompanyListingDetailClient slug={slug} listingId={id} />;
}
