import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessLeadDocument,
  canCommentOnLead,
  normalizeText,
  serializeDate,
} from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

interface CreateLeadNoteBody {
  text?: string;
}

function mapNoteDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    authorId: typeof data.authorId === "string" ? data.authorId : "",
    authorName:
      typeof data.authorName === "string" ? data.authorName : "Team member",
    text: typeof data.text === "string" ? data.text : "",
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const leadSnap = await leadRef.get();

  if (!leadSnap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const leadData = leadSnap.data() as Record<string, unknown>;
  if (!canAccessLeadDocument(user, companyId, leadData)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const notesSnap = await leadRef
    .collection("notes")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const notes = notesSnap.docs.map((doc) =>
    mapNoteDoc(doc.id, doc.data() as Record<string, unknown>),
  );

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const leadSnap = await leadRef.get();

  if (!leadSnap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const leadData = leadSnap.data() as Record<string, unknown>;
  if (!canCommentOnLead(user, companyId, leadData)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as CreateLeadNoteBody;
  const text = normalizeText(body.text);
  if (text.length < 2 || text.length > 2000) {
    return NextResponse.json(
      { error: "Note text must be between 2 and 2000 characters." },
      { status: 400 },
    );
  }

  const employeeSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();

  const authorName =
    (employeeSnap.exists && typeof employeeSnap.get("name") === "string"
      ? String(employeeSnap.get("name"))
      : user.email) || "Team member";

  const noteRef = leadRef.collection("notes").doc();
  const activityRef = leadRef.collection("activity").doc();

  const batch = adminDb().batch();
  batch.set(noteRef, {
    companyId,
    leadId,
    authorId: user.uid,
    authorName,
    text,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(activityRef, {
    companyId,
    leadId,
    type: "note_added",
    actorId: user.uid,
    actorName: authorName,
    message: "Added a lead note",
    metadata: {
      noteId: noteRef.id,
      notePreview: text.slice(0, 140),
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  batch.update(leadRef, {
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return NextResponse.json(
    {
      ok: true,
      note: {
        id: noteRef.id,
        authorId: user.uid,
        authorName,
        text,
        createdAt: null,
        updatedAt: null,
      },
    },
    { status: 201 },
  );
}
