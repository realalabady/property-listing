import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/constants/listing-categories";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAssignTasks,
  canCompleteTasks,
  canCreateTask,
  canViewTasks,
  serializeDate,
} from "@/lib/api/company-tasks";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

const VALID_PRIORITIES = new Set<string>(Object.values(TASK_PRIORITIES));
const VALID_STATUSES = new Set<string>(Object.values(TASK_STATUSES));

function parsePriority(v: unknown): TaskPriority | null {
  if (typeof v !== "string") return null;
  return VALID_PRIORITIES.has(v) ? (v as TaskPriority) : null;
}

function parseStatus(v: unknown): TaskStatus | null {
  if (typeof v !== "string") return null;
  return VALID_STATUSES.has(v) ? (v as TaskStatus) : null;
}

function normalizeText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim();
}

function normalizeUid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function prettifyEmailToName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Employee";

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveEmployeeName(data: Record<string, unknown>): string {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name && !isEmailLike(name)) return name;

  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  if (displayName && !isEmailLike(displayName)) return displayName;

  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (email) return prettifyEmailToName(email);

  if (name) return name;
  if (displayName) return displayName;

  return "Employee";
}

function parseIsoDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapTaskDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled",
    description: typeof data.description === "string" ? data.description : null,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : null,
    assignedToName:
      typeof data.assignedToName === "string"
        ? data.assignedToName
        : "Unassigned",
    priority: parsePriority(data.priority) ?? TASK_PRIORITIES.MEDIUM,
    status: parseStatus(data.status) ?? TASK_STATUSES.TODO,
    dueDate: serializeDate(data.dueDate),
    escalated: Boolean(data.escalated),
    relatedListingId:
      typeof data.relatedListingId === "string" ? data.relatedListingId : null,
    relatedLeadId:
      typeof data.relatedLeadId === "string" ? data.relatedLeadId : null,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    createdByName:
      typeof data.createdByName === "string" ? data.createdByName : null,
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!canViewTasks(user, companyId))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam ? parseStatus(statusParam) : null;
  if (statusParam && !statusFilter)
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  let query: FirebaseFirestore.Query = adminDb().collection(
    `companies/${companyId}/tasks`,
  );

  if (statusFilter) query = query.where("status", "==", statusFilter);

  // Users who can only complete tasks see only their assigned tasks
  if (!canCreateTask(user, companyId) && !canAssignTasks(user, companyId)) {
    query = query.where("assignedTo", "==", user.uid);
  }

  const snap = await query.orderBy("dueDate", "asc").limit(100).get();
  const tasks = snap.docs.map((doc) =>
    mapTaskDoc(doc.id, doc.data() as Record<string, unknown>),
  );

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!canCreateTask(user, companyId))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = normalizeText(body.title);
  if (!title)
    return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const priority = parsePriority(body.priority) ?? TASK_PRIORITIES.MEDIUM;
  const dueDateVal = parseIsoDate(body.dueDate);
  if (!dueDateVal)
    return NextResponse.json(
      { error: "dueDate is required (ISO string)." },
      { status: 400 },
    );

  const assignedTo = normalizeUid(body.assignedTo);

  // Resolve assignee name from employees if assignedTo is provided
  let assignedToName = "Unassigned";
  if (assignedTo) {
    const empSnap = await adminDb()
      .doc(`companies/${companyId}/employees/${assignedTo}`)
      .get();
    if (empSnap.exists) {
      const empData = empSnap.data() as Record<string, unknown>;
      assignedToName = resolveEmployeeName(empData);
    }
  }

  const now = FieldValue.serverTimestamp();
  const docRef = adminDb().collection(`companies/${companyId}/tasks`).doc();
  await docRef.set({
    companyId,
    title,
    description: normalizeText(body.description) || null,
    assignedTo: assignedTo ?? null,
    assignedToName,
    priority,
    status: TASK_STATUSES.TODO,
    dueDate: dueDateVal,
    escalated: false,
    relatedListingId: normalizeUid(body.relatedListingId),
    relatedLeadId: normalizeUid(body.relatedLeadId),
    createdBy: user.uid,
    createdByName: user.email ?? null,
    createdAt: now,
    updatedAt: now,
  });

  if (assignedTo) {
    await adminDb()
      .collection(`companies/${companyId}/notifications`)
      .add({
        companyId,
        recipientId: assignedTo,
        type: "task_assigned",
        title: "Task assigned to you",
        message: `${title} was assigned to you.`,
        taskId: docRef.id,
        read: false,
        actorId: user.uid,
        actorName: user.email ?? "Team member",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  return NextResponse.json({ id: docRef.id }, { status: 201 });
}
