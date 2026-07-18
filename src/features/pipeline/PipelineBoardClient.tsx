"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  DoorOpen,
  Globe,
  Inbox,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Share2,
  Store,
  Tag,
  Trash2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LeadDetailsModal } from "@/features/pipeline/LeadDetailsModal";
import { formatDate } from "@/lib/utils/format";
import {
  BOARD_ORDER_STEP,
  DEFAULT_STUCK_DEAL_HOURS,
  PIPELINE_STAGE_COLORS,
} from "@/constants/pipeline";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  leadSourceLabelAr,
} from "@/constants/listing-categories";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import type { BoardLead, PipelineStage } from "@/types/pipeline";

interface PipelineBoardClientProps {
  companyId: string;
  canManagePipeline: boolean;
}

type Columns = Record<string, BoardLead[]>;

const COLUMN_PREFIX = "column:";

function formatValue(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)} ر.س`;
}

function hoursInStage(lead: BoardLead): number | null {
  if (!lead.stageEnteredAt) return null;
  const entered = Date.parse(lead.stageEnteredAt);
  if (!Number.isFinite(entered)) return null;
  return Math.max(0, (Date.now() - entered) / 36e5);
}

/** Compact "12س" / "3ي"; the full "في المرحلة" context lives in the title. */
function timeInStageLabel(hours: number): string {
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}${t("pipeline.daysShort")}`;
  }
  return `${Math.floor(hours)}${t("pipeline.hoursShort")}`;
}

function initials(name: string | null): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0)).join("");
}

function findColumnOf(columns: Columns, leadId: string): string | null {
  for (const [key, leads] of Object.entries(columns)) {
    if (leads.some((l) => l.id === leadId)) return key;
  }
  return null;
}

/** boardOrder that drops a card at `index` inside an ordered column. */
function orderAtIndex(leads: BoardLead[], index: number, leadId: string): number {
  const others = leads.filter((l) => l.id !== leadId);
  const before = others[index - 1];
  const after = others[index];
  if (before && after) return (before.boardOrder + after.boardOrder) / 2;
  if (before) return before.boardOrder + BOARD_ORDER_STEP;
  if (after) return after.boardOrder - BOARD_ORDER_STEP;
  return 0;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

/** One icon per lead source, always paired with its Arabic label. */
const SOURCE_ICONS: Record<string, LucideIcon> = {
  website_form: Globe,
  whatsapp: MessageCircle,
  phone: Phone,
  walk_in: DoorOpen,
  social_media: Share2,
  referral: UserPlus,
  marketplace: Store,
  landing_request: Inbox,
  other: Tag,
};

function LeadCard({
  lead,
  overlay = false,
}: {
  lead: BoardLead;
  overlay?: boolean;
}) {
  const hours = hoursInStage(lead);
  const stuck = hours !== null && hours >= DEFAULT_STUCK_DEAL_HOURS;
  const SourceIcon = SOURCE_ICONS[lead.source] ?? Tag;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3.5 transition-all duration-200",
        overlay
          ? "rotate-2 shadow-lg"
          : "hover:-translate-y-px hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.14)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
          {lead.name}
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          {lead.priority === LEAD_PRIORITIES.URGENT && (
            <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              {LEAD_PRIORITY_LABELS.urgent.ar}
            </span>
          )}
          {lead.priority === LEAD_PRIORITIES.HIGH && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              {LEAD_PRIORITY_LABELS.high.ar}
            </span>
          )}
          {lead.estimatedValue !== null && lead.estimatedValue > 0 && (
            <span className="text-xs font-semibold tabular-nums text-primary">
              {formatValue(lead.estimatedValue)}
            </span>
          )}
        </span>
      </div>

      {lead.listingTitle && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {lead.listingTitle}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <SourceIcon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{leadSourceLabelAr(lead.source)}</span>
          {hours !== null && (
            <>
              <span className="text-border" aria-hidden>
                ·
              </span>
              <span
                title={t("pipeline.inStage")}
                className={cn(
                  "flex shrink-0 items-center gap-0.5 tabular-nums",
                  stuck && "font-semibold text-amber-600",
                )}
              >
                {stuck && <Clock3 className="h-3 w-3" aria-hidden />}
                {timeInStageLabel(hours)}
              </span>
            </>
          )}
        </span>
        {lead.assignedToName && (
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary"
            title={lead.assignedToName}
          >
            {initials(lead.assignedToName)}
          </span>
        )}
      </div>

      {lead.updatedAt && (
        <p className="mt-2.5 border-t border-border/50 pt-2 text-[10px] tabular-nums text-muted-foreground/80">
          {t("pipeline.lastUpdate")}: {formatDate(lead.updatedAt)}
        </p>
      )}
    </div>
  );
}

function SortableLeadCard({
  lead,
  onOpen,
}: {
  lead: BoardLead;
  onOpen: (lead: BoardLead) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("cursor-grab touch-none", isDragging && "opacity-40")}
      onClick={() => onOpen(lead)}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

function BoardColumn({
  stage,
  leads,
  onOpen,
}: {
  stage: PipelineStage;
  leads: BoardLead[];
  onOpen: (lead: BoardLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${COLUMN_PREFIX}${stage.key}`,
  });

  const totalValue = leads.reduce(
    (sum, l) => sum + (l.estimatedValue ?? 0),
    0,
  );

  return (
    <div
      className="flex max-h-full w-[290px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/40"
      style={{ borderTop: `3px solid ${stage.color}` }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ backgroundColor: `${stage.color}14` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {stage.labelAr}
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
            style={{ backgroundColor: `${stage.color}1f`, color: stage.color }}
          >
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span
            className="shrink-0 text-[11px] font-semibold tabular-nums"
            style={{ color: stage.color }}
            title={t("pipeline.totalValue")}
          >
            {formatValue(totalValue)}
          </span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0",
          isOver && "rounded-b-xl bg-primary/5",
        )}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onOpen={onOpen} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 p-4 text-xs text-muted-foreground">
            {t("pipeline.emptyColumn")}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage manager modal
// ---------------------------------------------------------------------------

interface StageManagerProps {
  companyId: string;
  stages: PipelineStage[];
  open: boolean;
  onClose: () => void;
  onStagesChanged: (stages: PipelineStage[]) => void;
}

function StageManagerModal({
  companyId,
  stages,
  open,
  onClose,
  onStagesChanged,
}: StageManagerProps) {
  const base = `/api/companies/${companyId}/pipeline/stages`;
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Partial<PipelineStage>>>(
    {},
  );
  const [newLabelAr, setNewLabelAr] = useState("");
  const [newLabelEn, setNewLabelEn] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    stageId: string;
    moveToStageKey: string;
  } | null>(null);

  const setDraft = (id: string, patch: Partial<PipelineStage>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  async function callApi(input: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(input, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const data = (await res.json().catch(() => ({}))) as {
        stages?: PipelineStage[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.code === "STAGE_NOT_EMPTY") {
          toast.error(t("pipeline.stageNotEmpty"));
          return false;
        }
        toast.error(data.error || t("pipeline.saveFailed"));
        return false;
      }
      if (Array.isArray(data.stages)) onStagesChanged(data.stages);
      return true;
    } catch {
      toast.error(t("pipeline.saveFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const saveStage = async (stage: PipelineStage) => {
    const draft = drafts[stage.id];
    if (!draft || Object.keys(draft).length === 0) return;
    const ok = await callApi(`${base}/${stage.id}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    if (ok) {
      toast.success(t("pipeline.stageSaved"));
      setDrafts((prev) => ({ ...prev, [stage.id]: {} }));
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    const next = stages.map((s) => s.key);
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    await callApi(base, {
      method: "PUT",
      body: JSON.stringify({ orderedKeys: next }),
    });
  };

  const addStage = async () => {
    if (newLabelAr.trim().length < 2) return;
    const ok = await callApi(base, {
      method: "POST",
      body: JSON.stringify({ labelAr: newLabelAr, labelEn: newLabelEn }),
    });
    if (ok) {
      toast.success(t("pipeline.stageAdded"));
      setNewLabelAr("");
      setNewLabelEn("");
    }
  };

  const removeStage = async (stage: PipelineStage) => {
    const params =
      deleteTarget?.stageId === stage.id && deleteTarget.moveToStageKey
        ? `?moveToStageKey=${encodeURIComponent(deleteTarget.moveToStageKey)}`
        : "";
    const ok = await callApi(`${base}/${stage.id}${params}`, {
      method: "DELETE",
    });
    if (ok) {
      toast.success(t("pipeline.stageDeleted"));
      setDeleteTarget(null);
    } else {
      // Column not empty — surface the reassign picker for this stage.
      setDeleteTarget((prev) =>
        prev?.stageId === stage.id
          ? prev
          : { stageId: stage.id, moveToStageKey: "" },
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("pipeline.manageStages")}
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("pipeline.close")}
        </Button>
      }
      className="max-w-2xl"
    >
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const draft = drafts[stage.id] ?? {};
          const color = draft.color ?? stage.color;
          const dirty = Object.keys(draft).length > 0;
          return (
            <div
              key={stage.id}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={t("pipeline.stageColor")}
                  disabled={busy}
                  onClick={() => {
                    const palette =
                      PIPELINE_STAGE_COLORS as readonly string[];
                    const nextColor =
                      palette[(palette.indexOf(color) + 1) % palette.length]!;
                    setDraft(stage.id, { color: nextColor });
                  }}
                  className="h-6 w-6 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
                <input
                  value={draft.labelAr ?? stage.labelAr}
                  onChange={(e) =>
                    setDraft(stage.id, { labelAr: e.target.value })
                  }
                  aria-label={t("pipeline.stageNameAr")}
                  className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
                />
                <input
                  value={draft.labelEn ?? stage.labelEn}
                  onChange={(e) =>
                    setDraft(stage.id, { labelEn: e.target.value })
                  }
                  aria-label={t("pipeline.stageNameEn")}
                  dir="ltr"
                  className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
                />
                {stage.wonStage && (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {t("pipeline.wonStage")}
                  </span>
                )}
                {stage.isTerminal && !stage.wonStage && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {t("pipeline.terminalStage")}
                  </span>
                )}
                <div className="ms-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("pipeline.moveUp")}
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("pipeline.moveDown")}
                    disabled={busy || index === stages.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  {dirty && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void saveStage(stage)}
                    >
                      {t("pipeline.save")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("pipeline.delete")}
                    disabled={busy || stages.length <= 2}
                    onClick={() => void removeStage(stage)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>

              {deleteTarget?.stageId === stage.id && (
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">
                    {t("pipeline.deleteMoveTo")}
                  </label>
                  <select
                    value={deleteTarget.moveToStageKey}
                    onChange={(e) =>
                      setDeleteTarget({
                        stageId: stage.id,
                        moveToStageKey: e.target.value,
                      })
                    }
                    className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                  >
                    <option value="">-</option>
                    {stages
                      .filter((s) => s.id !== stage.id)
                      .map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.labelAr}
                        </option>
                      ))}
                  </select>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy || !deleteTarget.moveToStageKey}
                    onClick={() => void removeStage(stage)}
                  >
                    {t("pipeline.confirmDelete")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-3">
          <input
            value={newLabelAr}
            onChange={(e) => setNewLabelAr(e.target.value)}
            placeholder={t("pipeline.stageNameAr")}
            className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
          />
          <input
            value={newLabelEn}
            onChange={(e) => setNewLabelEn(e.target.value)}
            placeholder={t("pipeline.stageNameEn")}
            dir="ltr"
            className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
          />
          <Button
            size="sm"
            disabled={busy || newLabelAr.trim().length < 2}
            onClick={() => void addStage()}
          >
            <Plus />
            {t("pipeline.addStage")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function PipelineBoardClient({
  companyId,
  canManagePipeline,
}: PipelineBoardClientProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [columns, setColumns] = useState<Columns>({});
  const [loading, setLoading] = useState(true);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [detailsLead, setDetailsLead] = useState<BoardLead | null>(null);
  const dragSnapshot = useRef<Columns | null>(null);
  // A drop also fires a click on the card — swallow that one.
  const suppressClick = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/pipeline/board`);
      const data = (await res.json().catch(() => ({}))) as {
        stages?: PipelineStage[];
        columns?: Columns;
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.stages)) {
        toast.error(data.error || t("pipeline.loadFailed"));
        return;
      }
      setStages(data.stages);
      setColumns(data.columns ?? {});
    } catch {
      toast.error(t("pipeline.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  // Stage list changed (added/removed/reordered) — reconcile columns.
  const handleStagesChanged = useCallback((next: PipelineStage[]) => {
    setStages(next);
    setColumns((prev) => {
      const merged: Columns = {};
      for (const stage of next) {
        merged[stage.key] = prev[stage.key] ?? [];
      }
      return merged;
    });
    // Deletions may have reassigned leads server-side — refresh in background.
    void loadBoard();
  }, [loadBoard]);

  const resolveOverColumn = useCallback(
    (overId: string): string | null => {
      if (overId.startsWith(COLUMN_PREFIX)) {
        return overId.slice(COLUMN_PREFIX.length);
      }
      return findColumnOf(columns, overId);
    },
    [columns],
  );

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      const leadId = String(event.active.id);
      const columnKey = findColumnOf(columns, leadId);
      const lead = columnKey
        ? (columns[columnKey] ?? []).find((l) => l.id === leadId)
        : null;
      setActiveLead(lead ?? null);
      dragSnapshot.current = columns;
      suppressClick.current = true;
    },
    [columns],
  );

  const openDetails = useCallback((lead: BoardLead) => {
    if (suppressClick.current) return;
    setDetailsLead(lead);
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const leadId = String(active.id);
      const from = findColumnOf(columns, leadId);
      const to = resolveOverColumn(String(over.id));
      if (!from || !to || from === to) return;

      // Optimistically carry the card into the hovered column.
      setColumns((prev) => {
        const lead = (prev[from] ?? []).find((l) => l.id === leadId);
        if (!lead) return prev;
        return {
          ...prev,
          [from]: (prev[from] ?? []).filter((l) => l.id !== leadId),
          [to]: [{ ...lead, stageKey: to }, ...(prev[to] ?? [])],
        };
      });
    },
    [columns, resolveOverColumn],
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const snapshot = dragSnapshot.current;
      dragSnapshot.current = null;
      setActiveLead(null);
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 150);
      if (!over || !snapshot) return;

      const leadId = String(active.id);
      const toColumn = resolveOverColumn(String(over.id));
      const fromColumn = findColumnOf(snapshot, leadId);
      if (!toColumn || !fromColumn) return;

      // Index the card should land at inside the target column.
      const targetLeads = columns[toColumn] ?? [];
      const overIndex = String(over.id).startsWith(COLUMN_PREFIX)
        ? targetLeads.length
        : targetLeads.findIndex((l) => l.id === String(over.id));
      const currentIndex = targetLeads.findIndex((l) => l.id === leadId);
      const index =
        overIndex >= 0
          ? overIndex
          : currentIndex >= 0
            ? currentIndex
            : targetLeads.length;

      if (fromColumn === toColumn && String(over.id) === leadId) {
        return; // dropped on itself, nothing moved
      }

      const boardOrder = orderAtIndex(targetLeads, index, leadId);

      // Apply final position locally.
      setColumns((prev) => {
        const source = findColumnOf(prev, leadId);
        if (!source) return prev;
        const lead = (prev[source] ?? []).find((l) => l.id === leadId);
        if (!lead) return prev;
        const without = (prev[source] ?? []).filter((l) => l.id !== leadId);
        const target =
          source === toColumn ? without : [...(prev[toColumn] ?? [])].filter(
            (l) => l.id !== leadId,
          );
        const updated = { ...lead, stageKey: toColumn, boardOrder };
        const nextTarget = [...target];
        nextTarget.splice(Math.min(index, nextTarget.length), 0, updated);
        nextTarget.sort((a, b) => a.boardOrder - b.boardOrder);
        return {
          ...prev,
          [source]: source === toColumn ? nextTarget : without,
          [toColumn]: nextTarget,
        };
      });

      void (async () => {
        try {
          const res = await fetch(
            `/api/companies/${companyId}/leads/${leadId}/stage`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stageKey: toColumn, boardOrder }),
            },
          );
          if (!res.ok) throw new Error("move_failed");
        } catch {
          setColumns(snapshot);
          toast.error(t("pipeline.moveFailed"));
        }
      })();
    },
    [columns, companyId, resolveOverColumn],
  );

  const openCount = useMemo(() => {
    return stages
      .filter((s) => !s.isTerminal)
      .reduce((sum, s) => sum + (columns[s.key]?.length ?? 0), 0);
  }, [stages, columns]);

  if (loading && stages.length === 0) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 w-[290px] shrink-0 animate-pulse rounded-xl bg-muted/60"
          />
        ))}
        <span className="sr-only">{t("pipeline.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {openCount} {t("pipeline.cards")}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadBoard()}
            aria-label={t("pipeline.refresh")}
          >
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
          {canManagePipeline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManagerOpen(true)}
            >
              <Settings2 />
              {t("pipeline.manageStages")}
            </Button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          if (dragSnapshot.current) setColumns(dragSnapshot.current);
          dragSnapshot.current = null;
          setActiveLead(null);
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 150);
        }}
      >
        <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <BoardColumn
              key={stage.key}
              stage={stage}
              leads={columns[stage.key] ?? []}
              onOpen={openDetails}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {canManagePipeline && (
        <StageManagerModal
          companyId={companyId}
          stages={stages}
          open={managerOpen}
          onClose={() => setManagerOpen(false)}
          onStagesChanged={handleStagesChanged}
        />
      )}

      {detailsLead && (
        <LeadDetailsModal
          companyId={companyId}
          lead={detailsLead}
          open
          onClose={() => {
            setDetailsLead(null);
            // Notes land on the audit trail and bump updatedAt — refresh
            // the card metadata quietly in the background.
            void loadBoard();
          }}
        />
      )}
    </div>
  );
}
