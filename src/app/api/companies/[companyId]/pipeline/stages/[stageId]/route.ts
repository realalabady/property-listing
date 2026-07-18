import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { normalizeText } from "@/lib/api/company-leads";
import { assertActiveMember } from "@/lib/api/guards";
import {
  canManagePipeline,
  loadStages,
  parseLegacyStatus,
  parseStageColor,
} from "@/lib/api/pipeline";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; stageId: string }>;
}

interface UpdateStageBody {
  labelEn?: unknown;
  labelAr?: unknown;
  color?: unknown;
  isTerminal?: unknown;
  wonStage?: unknown;
  legacyStatus?: unknown;
}

/** Edit a stage's label, color, or terminal/won flags (key is immutable). */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { companyId, stageId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canManagePipeline(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const stageRef = adminDb().doc(
    `companies/${companyId}/pipeline_stages/${stageId}`,
  );
  const stageSnap = await stageRef.get();
  if (!stageSnap.exists) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }

  const body = (await req.json()) as UpdateStageBody;
  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (body.labelAr !== undefined) {
    const labelAr = normalizeText(body.labelAr);
    if (labelAr.length < 2 || labelAr.length > 40) {
      return NextResponse.json(
        { error: "Stage Arabic label must be 2–40 characters." },
        { status: 400 },
      );
    }
    update.labelAr = labelAr;
  }
  if (body.labelEn !== undefined) {
    const labelEn = normalizeText(body.labelEn);
    if (labelEn.length < 2 || labelEn.length > 40) {
      return NextResponse.json(
        { error: "Stage English label must be 2–40 characters." },
        { status: 400 },
      );
    }
    update.labelEn = labelEn;
  }
  if (body.color !== undefined) {
    const color = parseStageColor(body.color);
    if (!color) {
      return NextResponse.json(
        { error: "Stage color must be a hex value like #10b981." },
        { status: 400 },
      );
    }
    update.color = color;
  }
  if (body.isTerminal !== undefined) update.isTerminal = body.isTerminal === true;
  if (body.wonStage !== undefined) update.wonStage = body.wonStage === true;
  if (body.legacyStatus !== undefined) {
    const legacyStatus = parseLegacyStatus(body.legacyStatus);
    if (!legacyStatus) {
      return NextResponse.json(
        { error: "Invalid legacy status." },
        { status: 400 },
      );
    }
    update.legacyStatus = legacyStatus;
  }

  await stageRef.update(update);

  const stages = await loadStages(companyId);
  return NextResponse.json({ ok: true, stages });
}

/**
 * Delete a stage. Refuses when leads still sit in the column unless the
 * caller names a `moveToStageKey`; then the leads are reassigned in batches
 * before the column disappears so no card is orphaned.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { companyId, stageId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canManagePipeline(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const membership = await assertActiveMember(user, companyId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const stages = await loadStages(companyId);
  const stage = stages.find((s) => s.id === stageId);
  if (!stage) {
    return NextResponse.json({ error: "Stage not found." }, { status: 404 });
  }
  if (stages.length <= 2) {
    return NextResponse.json(
      { error: "A pipeline needs at least two stages." },
      { status: 409 },
    );
  }

  const moveToStageKey = req.nextUrl.searchParams.get("moveToStageKey");
  const target = moveToStageKey
    ? stages.find((s) => s.key === moveToStageKey && s.key !== stage.key)
    : null;
  if (moveToStageKey && !target) {
    return NextResponse.json(
      { error: "moveToStageKey does not name another existing stage." },
      { status: 400 },
    );
  }

  const leadsRef = adminDb().collection(`companies/${companyId}/leads`);

  if (!target) {
    const occupied = await leadsRef
      .where("stageKey", "==", stage.key)
      .limit(1)
      .get();
    if (!occupied.empty) {
      return NextResponse.json(
        {
          error:
            "Stage still has leads. Pass moveToStageKey to reassign them first.",
          code: "STAGE_NOT_EMPTY",
        },
        { status: 409 },
      );
    }
  } else {
    // Reassign in pages of 300 to stay under the 500-write batch cap.
    while (true) {
      const page = await leadsRef
        .where("stageKey", "==", stage.key)
        .limit(300)
        .get();
      if (page.empty) break;

      const batch = adminDb().batch();
      for (const doc of page.docs) {
        batch.update(doc.ref, {
          stageKey: target.key,
          status: target.legacyStatus,
          stageEnteredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      if (page.size < 300) break;
    }
  }

  await adminDb()
    .doc(`companies/${companyId}/pipeline_stages/${stageId}`)
    .delete();

  const refreshed = await loadStages(companyId);
  return NextResponse.json({ ok: true, stages: refreshed });
}
