import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { NewListingForm } from "@/features/listings/NewListingForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("listings.addListingTitle"),
};

export default async function NewListingPage() {
  const user = await requireCompanyMember();

  const canCreate = hasPermission(user.permissions, PERMISSIONS.CREATE_LISTING);
  if (!canCreate || !user.companyId) {
    redirect(ROUTES.DASHBOARD_LISTINGS);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("listings.addListingTitle")}
        description={t("listings.addListingSubtitle")}
        actions={
          <Button variant="outline" asChild>
            <Link href={ROUTES.DASHBOARD_LISTINGS}>
              <ArrowRight className="rotate-180" />
              {t("listings.backToList")}
            </Link>
          </Button>
        }
      />
      <NewListingForm
        companyId={user.companyId as string}
        userId={user.uid}
      />
    </div>
  );
}
