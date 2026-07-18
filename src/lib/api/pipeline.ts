import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import {
  DEFAULT_PIPELINE_STAGES,
  BOARD_ORDER_STEP,
} from "@/constants/pipeline";
import {
  LEAD_STATUSES,
  parseLeadPriority,
  type LeadStatus,
} from "@/constants/listing-categories";
import { PERMISSIONS, hasAnyPermission } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { serializeDate } from "@/lib/api/company-leads";
import type { SessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import type { BoardLead, PipelineStage } from "@/types/pipeline";

const LEGACY_STATUS_VALUES = new Set<string>(Object.values(LEAD_STATUSES));

export function canManagePipeline(
  user: SessionUser | null,
  companyId: string,
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.companyId !== companyId) return false;
  return hasAnyPermission(user.permissions, [PERMISSIONS.MANAGE_PIPELINE]);
}

export function mapStageDoc(
  id: string,
  data: Record<string, unknown>,
): PipelineStage {
  const legacyStatus =
    typeof data.legacyStatus === "string" &&
    LEGACY_STATUS_VALUES.has(data.legacyStatus)
      ? (data.legacyStatus as LeadStatus)
      : LEAD_STATUSES.CONTACTED;

  return {
    id,
    companyId: typeof data.companyId === "string" ? data.companyId : "",
    key: typeof data.key === "string" ? data.key : id,
    labelEn: typeof data.labelEn === "string" ? data.labelEn : id,
    labelAr: typeof data.labelAr === "string" ? data.labelAr : id,
    color: typeof data.color === "string" ? data.color : "#6b7280",
    order: typeof data.order === "number" ? data.order : 0,
    isTerminal: data.isTerminal === true,
    wonStage: data.wonStage === true,
    legacyStatus,
    active: data.active !== false,
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

/**
 * Load a company's pipeline stages, seeding the five legacy lead statuses as
 * default columns on first access. Lazy seeding means companies created
 * before this feature (and new ones alike) get a working board without a
 * migration script. The seed batch uses create() so a concurrent first load
 * can't double-seed.
 */
export async function loadStages(companyId: string): Promise<PipelineStage[]> {
  const stagesRef = adminDb().collection(
    `companies/${companyId}/pipeline_stages`,
  );
  const snap = await stagesRef.get();

  if (snap.empty) {
    const batch = adminDb().batch();
    for (const seed of DEFAULT_PIPELINE_STAGES) {
      batch.create(stagesRef.doc(seed.key), {
        companyId,
        key: seed.key,
        labelEn: seed.labelEn,
        labelAr: seed.labelAr,
        color: seed.color,
        order: seed.order,
        isTerminal: seed.isTerminal,
        wonStage: seed.wonStage,
        legacyStatus: seed.legacyStatus,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch {
      // Another request seeded concurrently — fall through and re-read.
    }
    const seeded = await stagesRef.get();
    return seeded.docs
      .map((doc) => mapStageDoc(doc.id, doc.data() as Record<string, unknown>))
      .sort((a, b) => a.order - b.order);
  }

  return snap.docs
    .map((doc) => mapStageDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((stage) => stage.active)
    .sort((a, b) => a.order - b.order);
}

/**
 * Resolve the stage a lead sits in. Leads created before the Kanban feature
 * have no `stageKey`; their legacy `status` doubles as the stage key because
 * default stages are seeded under those exact keys.
 */
export function resolveStageKey(
  lead: Record<string, unknown>,
  stageKeys: Set<string>,
): string {
  if (typeof lead.stageKey === "string" && stageKeys.has(lead.stageKey)) {
    return lead.stageKey;
  }
  if (typeof lead.status === "string" && stageKeys.has(lead.status)) {
    return lead.status;
  }
  return LEAD_STATUSES.NEW;
}

export function mapBoardLead(
  id: string,
  data: Record<string, unknown>,
  stageKeys: Set<string>,
): BoardLead {
  const createdAtMs = (() => {
    const raw = serializeDate(data.createdAt);
    const ms = raw ? Date.parse(raw) : Number.NaN;
    return Number.isFinite(ms) ? ms : 0;
  })();

  return {
    id,
    name: typeof data.name === "string" ? data.name : "Unknown",
    phone: typeof data.phone === "string" ? data.phone : "",
    source: typeof data.source === "string" ? data.source : "other",
    quality: typeof data.quality === "string" ? data.quality : "unrated",
    listingTitle:
      typeof data.listingTitle === "string" ? data.listingTitle : null,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : null,
    assignedToName:
      typeof data.assignedToName === "string" ? data.assignedToName : null,
    priority: parseLeadPriority(data.priority),
    stageKey: resolveStageKey(data, stageKeys),
    // Legacy leads without boardOrder sort by recency: newer cards higher.
    boardOrder:
      typeof data.boardOrder === "number" && Number.isFinite(data.boardOrder)
        ? data.boardOrder
        : -createdAtMs / BOARD_ORDER_STEP,
    stageEnteredAt: serializeDate(data.stageEnteredAt ?? data.updatedAt),
    estimatedValue:
      typeof data.estimatedValue === "number" &&
      Number.isFinite(data.estimatedValue)
        ? data.estimatedValue
        : null,
    expectedCloseAt: serializeDate(data.expectedCloseAt),
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
}

const STAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;

/** Slugify a label into a stable machine key for custom stages. */
export function stageKeyFromLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  return STAGE_KEY_PATTERN.test(slug) ? slug : `stage_${Date.now()}`;
}

export function isValidStageKey(key: string): boolean {
  return STAGE_KEY_PATTERN.test(key);
}

export function parseLegacyStatus(value: unknown): LeadStatus | null {
  if (typeof value !== "string" || !LEGACY_STATUS_VALUES.has(value))
    return null;
  return value as LeadStatus;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function parseStageColor(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOR.test(value) ? value : null;
}
