import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canViewAssignedLeads, normalizeText } from "@/lib/api/company-leads";
import { assertActiveMember } from "@/lib/api/guards";
import {
  canManagePipeline,
  loadStages,
  parseLegacyStatus,
  parseStageColor,
  stageKeyFromLabel,
} from "@/lib/api/pipeline";
import { LEAD_STATUSES } from "@/constants/listing-categories";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

/** List the company's pipeline stages (seeds defaults on first access). */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  if (!canViewAssignedLeads(user, companyId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const stages = await loadStages(companyId);
  return NextResponse.json({ stages });
}

interface CreateStageBody {
  labelEn?: unknown;
  labelAr?: unknown;
  color?: unknown;
  isTerminal?: unknown;
  wonStage?: unknown;
  legacyStatus?: unknown;
}

/** Add a custom stage; it lands before the terminal columns. */
export async function POST(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
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

  const body = (await req.json()) as CreateStageBody;
  const labelEn = normalizeText(body.labelEn);
  const labelAr = normalizeText(body.labelAr);
  if (labelAr.length < 2 || labelAr.length > 40) {
    return NextResponse.json(
      { error: "Stage Arabic label must be 2–40 characters." },
      { status: 400 },
    );
  }
  if (labelEn.length > 40) {
    return NextResponse.json(
      { error: "Stage English label must be at most 40 characters." },
      { status: 400 },
    );
  }

  const color = parseStageColor(body.color) ?? "#6366f1";
  const isTerminal = body.isTerminal === true;
  const wonStage = body.wonStage === true;
  // Custom stages mirror a legacy status so KPI functions keep working:
  // won → deal, terminal → lost, anything else counts as "in progress".
  const legacyStatus =
    parseLegacyStatus(body.legacyStatus) ??
    (wonStage
      ? LEAD_STATUSES.DEAL
      : isTerminal
        ? LEAD_STATUSES.LOST
        : LEAD_STATUSES.CONTACTED);

  const stages = await loadStages(companyId);
  if (stages.length >= 12) {
    return NextResponse.json(
      { error: "A pipeline can have at most 12 stages." },
      { status: 409 },
    );
  }

  let key = stageKeyFromLabel(labelEn || labelAr);
  if (stages.some((s) => s.key === key)) {
    key = `${key}_${Date.now().toString().slice(-4)}`.slice(0, 40);
  }

  // Insert before the first terminal column so won/lost stay last.
  const firstTerminal = stages.find((s) => s.isTerminal);
  const order =
    !isTerminal && firstTerminal
      ? firstTerminal.order
      : (stages[stages.length - 1]?.order ?? -1) + 1;

  const stageRef = adminDb().doc(
    `companies/${companyId}/pipeline_stages/${key}`,
  );
  const batch = adminDb().batch();
  // Shift columns at/after the insertion point right by one.
  for (const stage of stages) {
    if (stage.order >= order) {
      batch.update(
        adminDb().doc(`companies/${companyId}/pipeline_stages/${stage.id}`),
        { order: stage.order + 1, updatedAt: FieldValue.serverTimestamp() },
      );
    }
  }
  batch.create(stageRef, {
    companyId,
    key,
    labelEn: labelEn || labelAr,
    labelAr,
    color,
    order,
    isTerminal,
    wonStage,
    legacyStatus,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  const refreshed = await loadStages(companyId);
  return NextResponse.json({ ok: true, stages: refreshed }, { status: 201 });
}

interface ReorderBody {
  orderedKeys?: unknown;
}

/** Reorder columns: body carries the full list of stage keys in new order. */
export async function PUT(req: NextRequest, context: RouteContext) {
  const { companyId } = await context.params;
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

  const body = (await req.json()) as ReorderBody;
  if (
    !Array.isArray(body.orderedKeys) ||
    body.orderedKeys.some((k) => typeof k !== "string")
  ) {
    return NextResponse.json(
      { error: "orderedKeys must be an array of stage keys." },
      { status: 400 },
    );
  }
  const orderedKeys = body.orderedKeys as string[];

  const stages = await loadStages(companyId);
  const currentKeys = new Set(stages.map((s) => s.key));
  if (
    orderedKeys.length !== stages.length ||
    orderedKeys.some((k) => !currentKeys.has(k)) ||
    new Set(orderedKeys).size !== orderedKeys.length
  ) {
    return NextResponse.json(
      { error: "orderedKeys must contain every stage key exactly once." },
      { status: 400 },
    );
  }

  const batch = adminDb().batch();
  orderedKeys.forEach((key, index) => {
    batch.update(
      adminDb().doc(`companies/${companyId}/pipeline_stages/${key}`),
      { order: index, updatedAt: FieldValue.serverTimestamp() },
    );
  });
  await batch.commit();

  const refreshed = await loadStages(companyId);
  return NextResponse.json({ ok: true, stages: refreshed });
}
