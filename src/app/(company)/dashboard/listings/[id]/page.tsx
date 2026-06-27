import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireCompanyMember } from "@/lib/auth/guards";
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DashboardListingDetailClient } from "@/features/listings/DashboardListingDetailClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("listings.viewDetails"),
};

export default async function DashboardListingDetailPage({
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
  const canDelete = hasPermission(user.permissions, PERMISSIONS.DELETE_LISTING);
  const canPublish = hasPermission(
    user.permissions,
    PERMISSIONS.PUBLISH_LISTING,
  );

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.DASHBOARD_LISTINGS}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        {t("listings.backToListings")}
      </Link>

      <DashboardListingDetailClient
        companyId={user.companyId as string}
        listingId={id}
        canEdit={canEdit}
        canDelete={canDelete}
        canPublish={canPublish}
      />
    </div>
  );
}
