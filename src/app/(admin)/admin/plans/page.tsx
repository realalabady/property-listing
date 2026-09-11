import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { getPlans, getPricingVisible } from "@/lib/plans/catalog";
import { resolvePlan } from "@/constants/plans";
import { AdminPlansClient } from "@/features/admin/AdminPlansClient";

export const metadata = {
  title: "الباقات",
};

// Plans, counts and the visibility switch must reflect the latest save.
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireSuperAdmin();
  const [plans, pricingVisible, companiesSnap] = await Promise.all([
    getPlans(),
    getPricingVisible(),
    adminDb().collection("companies").select("subscriptionPlan", "isDeleted", "deletedAt").get(),
  ]);

  // Live companies per plan (unknown ids count toward the plan they fall back to).
  const companyCounts: Record<string, number> = {};
  for (const doc of companiesSnap.docs) {
    const data = doc.data();
    if (data.isDeleted === true || data.deletedAt) continue;
    const id = resolvePlan(plans, data.subscriptionPlan).id;
    companyCounts[id] = (companyCounts[id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">الباقات</h2>
        <p className="text-sm text-muted-foreground">
          أظهر أو أخفِ صفحة الباقات، وعدّل كل باقة: الاسم والوصف والسعر والحدود
          والمزايا والعروض. التغييرات تُطبَّق فورًا.
        </p>
      </header>

      <AdminPlansClient
        plans={plans}
        companyCounts={companyCounts}
        pricingVisible={pricingVisible}
        nowMs={Date.now()}
      />
    </div>
  );
}
