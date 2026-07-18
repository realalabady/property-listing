import { redirect } from "next/navigation";
import { requireCompanyMember } from "@/lib/auth/guards";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PipelineBoardClient } from "@/features/pipeline/PipelineBoardClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("dashPages.pipelineTitle"),
};

export default async function DashboardPipelinePage() {
  const user = await requireCompanyMember();

  const canAccessBoard = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_LEADS,
    PERMISSIONS.ASSIGN_LEADS,
    PERMISSIONS.VIEW_OWN_LEADS,
  ]);
  if (!canAccessBoard || !user.companyId) {
    redirect(`${ROUTES.DASHBOARD}?denied=permission`);
  }

  const canManagePipeline = hasAnyPermission(user.permissions, [
    PERMISSIONS.MANAGE_PIPELINE,
  ]);

  return (
    // Full-bleed: escapes the dashboard's centered column (see layout.tsx)
    // and pins the board to the viewport height under the 4rem header, so
    // the page itself never scrolls — columns scroll internally.
    <div
      data-full-bleed
      className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-border bg-card/60 px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold text-foreground">
          {t("dashPages.pipelineTitle")}
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("dashPages.pipelineSubtitle")}
        </p>
      </div>

      <div className="min-h-0 flex-1 px-4 pt-3 sm:px-6">
        <PipelineBoardClient
          companyId={user.companyId as string}
          canManagePipeline={canManagePipeline}
        />
      </div>
    </div>
  );
}
