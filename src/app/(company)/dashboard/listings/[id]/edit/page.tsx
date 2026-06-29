import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NewListingForm } from "@/features/listings/NewListingForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("listings.editListing"),
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCompanyMember();
  const { id } = await params;

  const canEdit = hasAnyPermission(user.permissions, [
    PERMISSIONS.EDIT_LISTING,
    PERMISSIONS.EDIT_OWN_LISTING,
  ]);
  if (!canEdit || !user.companyId) {
    redirect(ROUTES.DASHBOARD_LISTING_DETAIL(id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("listings.editListing")}
        description={t("listings.addListingSubtitle")}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.DASHBOARD_LISTING_DETAIL(id)}>
              <ArrowRight className="rotate-180" />
              {t("listings.backToListings")}
            </Link>
          </Button>
        }
      />
      <NewListingForm
        companyId={user.companyId as string}
        userId={user.uid}
        mode="edit"
        listingId={id}
      />
    </div>
  );
}
