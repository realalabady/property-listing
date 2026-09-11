import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { PRICING_SETTINGS_DOC } from "@/lib/plans/catalog";

export const runtime = "nodejs";

/** PUT — show or hide the public /pricing page (super admin only). */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { visible?: unknown };
  if (typeof body.visible !== "boolean") {
    return NextResponse.json({ error: "visible must be true or false." }, {
      status: 400,
    });
  }

  await adminDb()
    .doc(PRICING_SETTINGS_DOC)
    .set({
      visible: body.visible,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    });
  return NextResponse.json({ ok: true, visible: body.visible });
}
