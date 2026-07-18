import type {
  LeadPriority,
  LeadStatus,
} from "@/constants/listing-categories";

/** Firestore doc: companies/{cid}/pipeline_stages/{stageId} (id == key). */
export interface PipelineStage {
  id: string;
  companyId: string;
  key: string;
  labelEn: string;
  labelAr: string;
  color: string;
  order: number;
  isTerminal: boolean;
  wonStage: boolean;
  legacyStatus: LeadStatus;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Lean lead projection rendered as a Kanban card. */
export interface BoardLead {
  id: string;
  name: string;
  phone: string;
  source: string;
  quality: string;
  listingTitle: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  priority: LeadPriority | null;
  stageKey: string;
  boardOrder: number;
  stageEnteredAt: string | null;
  estimatedValue: number | null;
  expectedCloseAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PipelineBoardData {
  stages: PipelineStage[];
  /** Leads grouped by stage key, ordered by boardOrder ascending. */
  columns: Record<string, BoardLead[]>;
}
