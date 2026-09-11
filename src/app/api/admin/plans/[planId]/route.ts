import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { normalizePlanId } from "@/constants/plans";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import {
  PLANS_COLLECTION,
  ensurePlansSeeded,
  planToDoc,
} from "@/lib/plans/catalog";
import { parsePlanInput } from "@/lib/plans/validate";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ planId: string }>;
}

async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthenticated." }, { status: 401 }),
    };
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }
  return { user, response: null };
}

/** PUT — replace one plan's full definition (super admin only). */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;

  const planId = normalizePlanId((await context.params).planId);
  const db = adminDb();
  await ensurePlansSeeded(db);

  const ref = db.doc(`${PLANS_COLLECTION}/${planId}`);
  if (!(await ref.get()).exists) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 404 });
  }

  const parsed = parsePlanInput(planId, await req.json().catch(() => ({})));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await ref.set({
    ...planToDoc(parsed.value),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.uid,
  });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE — remove a plan. Refused while any company is on it (move them
 * first) and for the last remaining plan.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { user, response } = await requireSuperAdmin();
  if (!user) return response;

  const planId = normalizePlanId((await context.params).planId);
  const db = adminDb();
  await ensurePlansSeeded(db);

  const [planSnap, allPlans, companiesSnap] = await Promise.all([
    db.doc(`${PLANS_COLLECTION}/${planId}`).get(),
    db.collection(PLANS_COLLECTION).count().get(),
    db.collection("companies").where("subscriptionPlan", "==", planId).get(),
  ]);
  if (!planSnap.exists) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 404 });
  }
  if (allPlans.data().count <= 1) {
    return NextResponse.json(
      { error: "لا يمكن حذف آخر باقة." },
      { status: 409 },
    );
  }
  const inUse = companiesSnap.docs.filter((doc) => {
    const data = doc.data();
    return data.isDeleted !== true && !data.deletedAt;
  }).length;
  if (inUse > 0) {
    return NextResponse.json(
      {
        error: `لا يمكن حذف الباقة: ${inUse} شركة مشتركة فيها. انقلها إلى باقة أخرى أولًا.`,
      },
      { status: 409 },
    );
  }

  await planSnap.ref.delete();
  return NextResponse.json({ ok: true });
}
