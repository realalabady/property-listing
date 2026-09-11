import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { PLAN_ID_PATTERN } from "@/constants/plans";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import {
  PLANS_COLLECTION,
  ensurePlansSeeded,
  planToDoc,
} from "@/lib/plans/catalog";
import { parsePlanInput } from "@/lib/plans/validate";

export const runtime = "nodejs";

/** `"Gold Plus"` → `"gold-plus"`; empty when nothing usable is left. */
function slugify(value: unknown): string {
  return typeof value === "string"
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
    : "";
}

/** POST — create a new plan (super admin only). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = (body.name ?? {}) as Record<string, unknown>;
  let id = slugify(body.id) || slugify(name.en);
  if (!PLAN_ID_PATTERN.test(id)) {
    id = `plan-${Date.now().toString(36)}`;
  }

  const db = adminDb();
  await ensurePlansSeeded(db);
  const ref = db.doc(`${PLANS_COLLECTION}/${id}`);
  if ((await ref.get()).exists) {
    return NextResponse.json(
      { error: "يوجد باقة بنفس المعرّف. غيّر الاسم الإنجليزي." },
      { status: 409 },
    );
  }

  const parsed = parsePlanInput(id, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await ref.set({
    ...planToDoc(parsed.value),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.uid,
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
