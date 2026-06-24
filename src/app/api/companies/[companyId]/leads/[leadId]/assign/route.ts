import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAssignCompanyLeads,
  canManageCompanyLeads,
  serializeDate,
} from "@/lib/api/company-leads";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

interface AssignLeadBody {
  assignedTo?: string | null;
}

function normalizeUid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const canAssign =
    canManageCompanyLeads(user, companyId) ||
    canAssignCompanyLeads(user, companyId);
  if (!canAssign) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const body = (await req.json()) as AssignLeadBody;
  const assignedTo = normalizeUid(body.assignedTo);

  let assigneeName: string | null = null;
  if (assignedTo) {
    const employeeSnap = await adminDb()
      .doc(`companies/${companyId}/employees/${assignedTo}`)
      .get();

    if (!employeeSnap.exists || employeeSnap.get("active") === false) {
      return NextResponse.json(
        { error: "Target employee is missing or inactive." },
        { status: 400 },
      );
    }

    assigneeName =
      typeof employeeSnap.get("name") === "string"
        ? String(employeeSnap.get("name"))
        : "Assigned employee";
  }

  const previousAssignedTo =
    typeof leadSnap.get("assignedTo") === "string"
      ? String(leadSnap.get("assignedTo"))
      : null;
  const leadName =
    typeof leadSnap.get("name") === "string"
      ? String(leadSnap.get("name"))
      : "Lead";
  const previousAssignedToName =
    typeof leadSnap.get("assignedToName") === "string"
      ? String(leadSnap.get("assignedToName"))
      : "Unassigned";

  const batch = adminDb().batch();
  batch.update(leadRef, {
    assignedTo,
    assignedToName: assigneeName,
    assignedAt: assignedTo ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (assignedTo !== previousAssignedTo) {
    const actorSnap = await adminDb()
      .doc(`companies/${companyId}/employees/${user.uid}`)
      .get();

    const actorName =
      (actorSnap.exists && typeof actorSnap.get("name") === "string"
        ? String(actorSnap.get("name"))
        : user.email) || "Team member";

    batch.set(leadRef.collection("activity").doc(), {
      companyId,
      leadId,
      type: "lead_reassigned",
      actorId: user.uid,
      actorName,
      message: assignedTo
        ? `Reassigned lead to ${assigneeName}`
        : "Removed lead assignee",
      metadata: {
        fromAssigneeId: previousAssignedTo,
        fromAssigneeName: previousAssignedToName,
        toAssigneeId: assignedTo,
        toAssigneeName: assigneeName,
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
          message: `${leadName} was assigned to you.`,
          leadId,
          read: false,
          actorId: user.uid,
          actorName,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
      );
    }
  }

  await batch.commit();

  return NextResponse.json({
    ok: true,
    assignment: {
      leadId,
      assignedTo,
      assignedToName: assigneeName,
      updatedAt: serializeDate(new Date()),
    },
  });
}
