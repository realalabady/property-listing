import { LEAD_STATUSES, type LeadStatus } from "./listing-categories";

/**
 * Kanban Sales Pipeline
 * ---------------------
 * Companies get a customizable set of pipeline stages (Firestore:
 * `companies/{cid}/pipeline_stages/{stageId}` where the doc id IS the stage
 * key). The five legacy lead statuses are seeded as default stages so old
 * leads map cleanly; each stage carries a `legacyStatus` that is mirrored
 * onto the lead's `status` field on every move to keep KPI functions and the
 * classic leads table working unchanged.
 */

export interface PipelineStageSeed {
  key: string;
  labelEn: string;
  labelAr: string;
  /** Hex color for the column header pill. */
  color: string;
  /** 0-based column position. */
  order: number;
  /** Terminal stages (won/lost) are excluded from "open pipeline" counts. */
  isTerminal: boolean;
  /** Exactly one stage drives revenue/conversion KPIs. */
  wonStage: boolean;
  /** Legacy lead `status` mirrored onto leads that sit in this stage. */
  legacyStatus: LeadStatus;
}

export const DEFAULT_PIPELINE_STAGES: PipelineStageSeed[] = [
  {
    key: LEAD_STATUSES.NEW,
    labelEn: "New",
    labelAr: "جديد",
    color: "#3b82f6",
    order: 0,
    isTerminal: false,
    wonStage: false,
    legacyStatus: LEAD_STATUSES.NEW,
  },
  {
    key: LEAD_STATUSES.CONTACTED,
    labelEn: "Contacted",
    labelAr: "تم التواصل",
    color: "#8b5cf6",
    order: 1,
    isTerminal: false,
    wonStage: false,
    legacyStatus: LEAD_STATUSES.CONTACTED,
  },
  {
    key: LEAD_STATUSES.QUALIFIED,
    labelEn: "Qualified",
    labelAr: "مؤهل",
    color: "#f59e0b",
    order: 2,
    isTerminal: false,
    wonStage: false,
    legacyStatus: LEAD_STATUSES.QUALIFIED,
  },
  {
    key: LEAD_STATUSES.DEAL,
    labelEn: "Deal Won",
    labelAr: "صفقة",
    color: "#10b981",
    order: 3,
    isTerminal: true,
    wonStage: true,
    legacyStatus: LEAD_STATUSES.DEAL,
  },
  {
    key: LEAD_STATUSES.LOST,
    labelEn: "Lost",
    labelAr: "مفقود",
    color: "#6b7280",
    order: 4,
    isTerminal: true,
    wonStage: false,
    legacyStatus: LEAD_STATUSES.LOST,
  },
];

/** Palette offered in the stage editor (keeps custom columns on-brand). */
export const PIPELINE_STAGE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#f97316",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#6366f1",
  "#6b7280",
] as const;

/** Hours in a non-terminal stage before a lead is flagged as stuck. */
export const DEFAULT_STUCK_DEAL_HOURS = 72;

/** Cards fetched per column on the initial board load. */
export const BOARD_COLUMN_LIMIT = 50;

/**
 * Fractional-indexing step for `boardOrder`. New cards land at
 * (top - STEP); drops between neighbors use the midpoint so a move
 * touches exactly one document.
 */
export const BOARD_ORDER_STEP = 1024;
