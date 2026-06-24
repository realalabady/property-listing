import { redirect } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { requireCompanyMember } from "@/lib/auth/guards";
import { DashboardTasksClient } from "@/features/tasks/DashboardTasksClient";

export const metadata = {
  title: "المهام",
};

export default async function DashboardTasksPage() {
  const user = await requireCompanyMember();
  const companyId = user.companyId as string;
  const perms = user.permissions as string[];

  const canCreate = perms.includes(PERMISSIONS.CREATE_TASK);
  const canAssign = perms.includes(PERMISSIONS.ASSIGN_TASKS);
  const canComplete = perms.includes(PERMISSIONS.COMPLETE_TASKS);

  if (!canCreate && !canAssign && !canComplete) {
    redirect("/dashboard");
  }

  return (
    <DashboardTasksClient
      companyId={companyId}
      currentUserId={user.uid}
      canCreate={canCreate}
      canAssign={canAssign}
      canComplete={canComplete}
    />
  );
}
