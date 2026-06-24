import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { ROLES } from "@/constants/roles";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

function canAccessCompany(
  user: Awaited<ReturnType<typeof getSessionUser>>,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.companyId === companyId;
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canAccessCompany(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snap = await adminDb()
    .collection(`companies/${companyId}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const notifications = snap.docs
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        recipientId:
          typeof data.recipientId === "string" ? data.recipientId : null,
        type: typeof data.type === "string" ? data.type : "general",
        title: typeof data.title === "string" ? data.title : "Notification",
        message:
          typeof data.message === "string" ? data.message : "New update.",
        leadId: typeof data.leadId === "string" ? data.leadId : null,
        taskId: typeof data.taskId === "string" ? data.taskId : null,
        read: data.read === true,
        createdAt: serializeDate(data.createdAt),
      };
    })
    .filter((item) => item.recipientId === user.uid);

  return NextResponse.json({ notifications });
}

export async function PATCH(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  if (!canAccessCompany(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const snap = await adminDb()
    .collection(`companies/${companyId}/notifications`)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const batch = adminDb().batch();
  let markedCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const recipientId =
      typeof data.recipientId === "string" ? data.recipientId : null;
    const alreadyRead = data.read === true;

    if (recipientId === user.uid && !alreadyRead) {
      batch.update(doc.ref, {
        read: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      markedCount += 1;
    }
  }

  if (markedCount > 0) {
    await batch.commit();
  }

  return NextResponse.json({ ok: true, markedCount });
}
