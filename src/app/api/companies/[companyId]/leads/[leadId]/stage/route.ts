import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canActOnAnyLead,
  canViewAssignedLeads,
  getLeadsVisibility,
  toDate,
} from "@/lib/api/company-leads";
import { assertActiveMember } from "@/lib/api/guards";
import { loadStages } from "@/lib/api/pipeline";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; leadId: string }>;
}

interface MoveStageBody {
  stageKey?: unknown;
  boardOrder?: unknown;
  estimatedValue?: unknown;
  expectedCloseAt?: unknown;
}

function parseFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The drag-drop endpoint: move a lead to a pipeline stage (and/or reorder it
 * within its column). Mirrors the stage's legacy status onto the lead so KPI
 * functions and the classic leads table keep working, logs a timeline entry,
 * and stamps first-response metrics when a lead leaves "new".
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { companyId, leadId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const visibility = await getLeadsVisibility(companyId);
  const canMoveAny = canActOnAnyLead(user, companyId, visibility);

  const body = (await req.json()) as MoveStageBody;
  if (typeof body.stageKey !== "string" || body.stageKey.length === 0) {
    return NextResponse.json(
      { error: "stageKey is required." },
      { status: 400 },
    );
  }
  const stageKey = body.stageKey;
  const boardOrder = parseFiniteNumber(body.boardOrder);

  const estimatedValueProvided = body.estimatedValue !== undefined;
  const estimatedValue =
    body.estimatedValue === null ? null : parseFiniteNumber(body.estimatedValue);
  if (estimatedValueProvided && estimatedValue !== null && estimatedValue < 0) {
    return NextResponse.json(
      { error: "estimatedValue must be a non-negative number." },
      { status: 400 },
    );
  }

  const expectedCloseProvided = body.expectedCloseAt !== undefined;
  let expectedCloseAt: Timestamp | null = null;
  if (expectedCloseProvided && body.expectedCloseAt !== null) {
    const parsed = toDate(body.expectedCloseAt);
    if (!parsed) {
      return NextResponse.json(
        { error: "expectedCloseAt must be a valid date." },
        { status: 400 },
      );
    }
    expectedCloseAt = Timestamp.fromDate(parsed);
  }

  const stages = await loadStages(companyId);
  const stage = stages.find((s) => s.key === stageKey);
  if (!stage) {
    return NextResponse.json(
      { error: "Unknown pipeline stage." },
      { status: 400 },
    );
  }

  const actorSnap = await adminDb()
    .doc(`companies/${companyId}/employees/${user.uid}`)
    .get();
  const actorName =
    (actorSnap.exists && typeof actorSnap.get("name") === "string"
      ? String(actorSnap.get("name"))
      : user.email) || "Team member";

  const leadRef = adminDb().doc(`companies/${companyId}/leads/${leadId}`);

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const leadSnap = await tx.get(leadRef);
      if (!leadSnap.exists) {
        throw new StageMoveError(404, "Lead not found.");
      }
      const lead = leadSnap.data() as Record<string, unknown>;

      if (!canMoveAny && lead.assignedTo !== user.uid) {
        throw new StageMoveError(403, "Forbidden.");
      }

      const stageKeys = new Set(stages.map((s) => s.key));
      const fromStageKey =
        typeof lead.stageKey === "string" && stageKeys.has(lead.stageKey)
          ? lead.stageKey
          : typeof lead.status === "string" && stageKeys.has(lead.status)
            ? lead.status
            : null;
      const stageChanged = fromStageKey !== stage.key;

      const update: Record<string, unknown> = {
        stageKey: stage.key,
        status: stage.legacyStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (boardOrder !== null) update.boardOrder = boardOrder;
      if (stageChanged) update.stageEnteredAt = FieldValue.serverTimestamp();
      if (estimatedValueProvided) update.estimatedValue = estimatedValue;
      if (expectedCloseProvided) update.expectedCloseAt = expectedCloseAt;

      // Leaving "new" for the first time counts as the first response.
      if (stageChanged && fromStageKey === "new" && !lead.firstResponseAt) {
        const createdAt = toDate(lead.createdAt);
        update.firstResponseAt = FieldValue.serverTimestamp();
        if (createdAt) {
          update.responseTimeMinutes = Math.max(
            0,
            Math.round((Date.now() - createdAt.getTime()) / 60000),
          );
        }
      }

      tx.update(leadRef, update);

      if (stageChanged) {
        const fromStage = stages.find((s) => s.key === fromStageKey);
        tx.set(leadRef.collection("activity").doc(), {
          companyId,
          leadId,
          type: "stage_changed",
          actorId: user.uid,
          actorName,
          message: `Moved lead to ${stage.labelEn}`,
          metadata: {
            fromStageKey: fromStageKey ?? null,
            fromStageLabel: fromStage?.labelEn ?? null,
            toStageKey: stage.key,
            toStageLabel: stage.labelEn,
            wonStage: stage.wonStage,
          },
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return { stageChanged, fromStageKey };
    });

    return NextResponse.json({
      ok: true,
      move: {
        leadId,
        stageKey: stage.key,
        status: stage.legacyStatus,
        boardOrder,
        stageChanged: result.stageChanged,
        fromStageKey: result.fromStageKey,
      },
    });
  } catch (err) {
    if (err instanceof StageMoveError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

class StageMoveError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
