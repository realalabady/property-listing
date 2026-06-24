import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { LEAD_STATUSES } from "@/constants/listing-categories";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAssignCompanyLeads,
  canManageCompanyLeads,
  parseLeadStatus,
  toDate,
} from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

interface BulkLeadBody {
  leadIds?: unknown;
  action?: "status" | "assign";
  status?: unknown;
  assignedTo?: unknown;
}

function parseLeadIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const next = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const id = entry.trim();
    if (!id) continue;
    next.add(id);
  }

  if (next.size === 0) return null;
  if (next.size > 100) return null;
  return Array.from(next);
}

function normalizeUid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const canManageLeads = canManageCompanyLeads(user, companyId);
  const canAssignLeads = canAssignCompanyLeads(user, companyId);
  if (!canManageLeads && !canAssignLeads) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json()) as BulkLeadBody;
  const leadIds = parseLeadIds(body.leadIds);
  if (!leadIds) {
    return NextResponse.json(
      { error: "leadIds must be an array of up to 100 lead document ids." },
      { status: 400 },
    );
  }

  if (body.action !== "status" && body.action !== "assign") {
    return NextResponse.json(
      { error: "action must be either 'status' or 'assign'." },
      { status: 400 },
    );
  }

  if (body.action === "status" && !canManageLeads) {
    return NextResponse.json(
      { error: "Only users with manage_leads can update lead status in bulk." },
      { status: 403 },
    );
  }

  let targetStatus: ReturnType<typeof parseLeadStatus> = null;
  let assignedTo: string | null = null;
  let assignedToName: string | null = null;

  if (body.action === "status") {
    targetStatus = parseLeadStatus(body.status);
    if (!targetStatus) {
      return NextResponse.json(
        { error: "Invalid lead status." },
        { status: 400 },
      );
    }
  }

  if (body.action === "assign") {
    assignedTo = normalizeUid(body.assignedTo);

    if (assignedTo) {
      const assigneeSnap = await adminDb()
        .doc(`companies/${companyId}/employees/${assignedTo}`)
        .get();

      if (!assigneeSnap.exists || assigneeSnap.get("active") === false) {
        return NextResponse.json(
          { error: "Target employee is missing or inactive." },
          { status: 400 },
        );
      }

      assignedToName =
        typeof assigneeSnap.get("name") === "string"
          ? String(assigneeSnap.get("name"))
          : "Assigned employee";
    }
  }

  const actorSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();
  const actorName =
    (actorSnap.exists && typeof actorSnap.get("name") === "string"
      ? String(actorSnap.get("name"))
      : user.email) || "Team member";

  const leadRefs = leadIds.map((id) =>
    adminDb().doc(`companies/${companyId}/leads/${id}`),
  );
  const leadSnaps = await adminDb().getAll(...leadRefs);

  const missingLeadIds = leadSnaps
    .filter((snap) => !snap.exists)
    .map((snap) => snap.id);

  if (missingLeadIds.length > 0) {
    return NextResponse.json(
      {
        error: "One or more leads were not found.",
        missingLeadIds,
      },
      { status: 404 },
    );
  }

  const batch = adminDb().batch();

  for (const leadSnap of leadSnaps) {
    const leadData = leadSnap.data() as Record<string, unknown>;
    const leadRef = leadSnap.ref;

    if (body.action === "status" && targetStatus) {
      const shouldSetFirstResponse =
        targetStatus !== LEAD_STATUSES.NEW &&
        targetStatus !== LEAD_STATUSES.LOST &&
        !leadData.firstResponseAt;

      const createdAt = toDate(leadData.createdAt);
      const responseTimeMinutes =
        shouldSetFirstResponse && createdAt
          ? Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 60000))
          : null;

      batch.update(leadRef, {
        status: targetStatus,
        updatedAt: FieldValue.serverTimestamp(),
        ...(shouldSetFirstResponse
          ? { firstResponseAt: FieldValue.serverTimestamp() }
          : {}),
        ...(responseTimeMinutes !== null ? { responseTimeMinutes } : {}),
      });

      batch.set(leadRef.collection("activity").doc(), {
        companyId,
        leadId: leadRef.id,
        type: "lead_status_changed",
        actorId: user.uid,
        actorName,
        message: `Changed lead status to ${targetStatus}`,
        metadata: {
          status: targetStatus,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
      continue;
    }

    if (body.action === "assign") {
      batch.update(leadRef, {
        assignedTo,
        assignedToName,
        assignedAt: assignedTo ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.set(leadRef.collection("activity").doc(), {
        companyId,
        leadId: leadRef.id,
        type: "lead_bulk_assignment",
        actorId: user.uid,
        actorName,
        message: assignedTo
          ? `Assigned lead to ${assignedToName}`
          : "Removed lead assignee",
        metadata: {
          assignedTo,
          assignedToName,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      if (assignedTo) {
        batch.set(
          adminDb().collection(`companies/${companyId}/notifications`).doc(),
          {
            companyId,
            recipientId: assignedTo,
            type: "lead_assigned",
            title: "Lead assigned to you",
            message:
              typeof leadData.name === "string"
                ? `${String(leadData.name)} was assigned to you.`
                : "A lead was assigned to you.",
            leadId: leadRef.id,
            read: false,
            actorId: user.uid,
            actorName,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
        );
      }
    }
  }

  await batch.commit();

  return NextResponse.json({
    ok: true,
    action: body.action,
    updatedCount: leadIds.length,
  });
}
