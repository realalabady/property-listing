import { CompanyListingDetailClient } from "@/features/public/CompanyListingDetailClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";
import {
  getCompanyBySlugServer,
  getCompanyListingByIdServer,
} from "@/features/public/data.server";

export const runtime = "nodejs";

export const metadata = {
  title: "عقار الشركة",
};

export default async function CompanyListingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  // Server-render the company + listing so the page arrives populated instead
  // of the browser doing a cold, sequential Firestore fetch after hydration.
  const initialCompany = await getCompanyBySlugServer(slug);
  const initialListing = initialCompany
    ? await getCompanyListingByIdServer(initialCompany.id, id)
    : null;

  return (
    <DarPublicShell>
      <CompanyListingDetailClient
        slug={slug}
        listingId={id}
        initialCompany={initialCompany}
        initialListing={initialListing}
      />
    </DarPublicShell>
  );
}
