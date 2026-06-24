import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DashboardListingsClient } from "@/features/listings/DashboardListingsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("dashPages.listingsTitle"),
};

export default async function DashboardListingsPage() {
  const user = await requireCompanyMember();

  const canCreate = hasPermission(user.permissions, PERMISSIONS.CREATE_LISTING);
  const canEdit = hasAnyPermission(user.permissions, [
    PERMISSIONS.EDIT_LISTING,
    PERMISSIONS.EDIT_OWN_LISTING,
  ]);
  const canDelete = hasPermission(user.permissions, PERMISSIONS.DELETE_LISTING);
  const canPublish = hasPermission(
    user.permissions,
    PERMISSIONS.PUBLISH_LISTING,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashPages.listingsTitle")}
        description={t("dashPages.listingsSubtitle")}
        actions={
          canCreate ? (
            <Button asChild>
              <Link href={ROUTES.DASHBOARD_LISTING_NEW}>
                <Plus />
                {t("listings.newListing")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <DashboardListingsClient
        companyId={user.companyId as string}
        userId={user.uid}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canPublish={canPublish}
      />
    </div>
  );
}
