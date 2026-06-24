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
  serializeDate,
} from "@/lib/api/company-tasks";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; taskId: string }>;
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

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId, taskId } = await context.params;
  const user = await getSessionUser();

  if (!user)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });

  const canCreate = canCreateTask(user, companyId);
  const canAssign = canAssignTasks(user, companyId);
  const canComplete = canCompleteTasks(user, companyId);

  if (!canCreate && !canAssign && !canComplete) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const taskRef = adminDb().doc(`companies/${companyId}/tasks/${taskId}`);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const previousAssignedTo =
    typeof taskSnap.get("assignedTo") === "string"
      ? String(taskSnap.get("assignedTo"))
      : null;
  const previousTitle =
    typeof taskSnap.get("title") === "string"
      ? String(taskSnap.get("title"))
      : "Task";
  let nextAssignedToForNotification: string | null | undefined;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Build partial update — only allowed fields
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (canCreate && body.title !== undefined) {
    const title = normalizeText(body.title);
    if (!title)
      return NextResponse.json(
        { error: "Title cannot be empty." },
        { status: 400 },
      );
    update.title = title;
  }

  if (canCreate && body.description !== undefined) {
    update.description = normalizeText(body.description) || null;
  }

  if (canCreate && body.priority !== undefined) {
    const priority = parsePriority(body.priority);
    if (!priority)
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    update.priority = priority;
  }

  if (canCreate && body.dueDate !== undefined) {
    const due = parseIsoDate(body.dueDate);
    if (!due)
      return NextResponse.json({ error: "Invalid dueDate." }, { status: 400 });
    update.dueDate = due;
  }

  if ((canCreate || canAssign) && body.assignedTo !== undefined) {
    const assignedTo = normalizeUid(body.assignedTo);
    update.assignedTo = assignedTo ?? null;
    nextAssignedToForNotification = assignedTo;
    if (assignedTo) {
      const empSnap = await adminDb()
        .doc(`companies/${companyId}/employees/${assignedTo}`)
        .get();
      const empData = empSnap.exists
        ? (empSnap.data() as Record<string, unknown>)
        : {};
      update.assignedToName = resolveEmployeeName(empData);
    } else {
      update.assignedToName = "Unassigned";
    }
  }

  if ((canCreate || canComplete) && body.status !== undefined) {
    const status = parseStatus(body.status);
    if (!status)
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    update.status = status;
    if (status === TASK_STATUSES.DONE) {
      update.completedAt = FieldValue.serverTimestamp();
    } else {
      update.completedAt = null;
    }
  }

  await taskRef.update(update);

  if (
    nextAssignedToForNotification &&
    nextAssignedToForNotification !== previousAssignedTo
  ) {
    const taskTitleForNotification =
      typeof update.title === "string" ? String(update.title) : previousTitle;

    await adminDb()
      .collection(`companies/${companyId}/notifications`)
      .add({
        companyId,
        recipientId: nextAssignedToForNotification,
        type: "task_assigned",
        title: "Task assigned to you",
        message: `${taskTitleForNotification} was assigned to you.`,
        taskId,
        read: false,
        actorId: user.uid,
        actorName: user.email ?? "Team member",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  const updatedSnap = await taskRef.get();
  const data = updatedSnap.data() as Record<string, unknown>;

  return NextResponse.json({
    task: {
      id: taskId,
      status: parseStatus(data.status) ?? TASK_STATUSES.TODO,
      updatedAt: serializeDate(data.updatedAt),
    },
  });
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { companyId, taskId } = await context.params;
  const user = await getSessionUser();

  if (!user)
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  if (!canCreateTask(user, companyId))
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const taskRef = adminDb().doc(`companies/${companyId}/tasks/${taskId}`);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });

  await taskRef.delete();

  return NextResponse.json({ success: true });
}
