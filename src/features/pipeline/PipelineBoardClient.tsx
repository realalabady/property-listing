"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  DoorOpen,
  Flame,
  Globe,
  Inbox,
  Layers,
  Maximize2,
  MessageCircle,
  Minimize2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  Store,
  Tag,
  Trash2,
  Trophy,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LeadDetailsModal } from "@/features/pipeline/LeadDetailsModal";
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
/** Sentinel for the "unassigned" option in the assignee filter. */
const UNASSIGNED = "__unassigned__";

/**
 * Built-in Arabic fallbacks for every key this board uses.
 * If a key is missing from the global i18n dictionary, t() returns the raw
 * key (e.g. "pipeline.allAssignees") — tr() catches that and falls back to
 * the value below, so the UI never shows a raw key. The dictionary still
 * wins whenever the key exists there.
 */
const PIPELINE_FALLBACKS: Record<string, string> = {
  "pipeline.activeLeads": "عميل نشط",
  "pipeline.total": "الإجمالي",
  "pipeline.matchingFilters": "مطابق للفلاتر",
  "pipeline.loading": "جارٍ التحميل…",
  "pipeline.loadFailed": "تعذر تحميل اللوحة",
  "pipeline.moveFailed": "تعذر نقل البطاقة",
  "pipeline.refresh": "تحديث",
  "pipeline.manageStages": "إدارة المراحل",
  "pipeline.daysShort": "ي",
  "pipeline.hoursShort": "س",
  "pipeline.minutesShort": "د",
  "pipeline.justNow": "الآن",
  "pipeline.inStage": "في المرحلة",
  "pipeline.stuckDeal": "عالق",
  "pipeline.lastUpdate": "آخر تحديث",
  "pipeline.unknownLead": "عميل غير معروف",
  "pipeline.priorityNormal": "عادي",
  "pipeline.totalValue": "القيمة الإجمالية",
  "pipeline.emptyColumn": "أفلت البطاقات هنا",
  "pipeline.allFilteredOut": "لا نتائج ضمن الفلاتر",
  "pipeline.searchPlaceholder": "ابحث بالاسم أو الطلب أو الرقم…",
  "pipeline.highPriorityOnly": "الأولوية العالية فقط",
  "pipeline.stuckOnly": "العالقة فقط",
  "pipeline.filterByAssignee": "تصفية حسب المسؤول",
  "pipeline.allAssignees": "كل المسؤولين",
  "pipeline.unassigned": "غير مسند",
  "pipeline.clearFilters": "مسح الفلاتر",
  "pipeline.pipelineValue": "قيمة المسار النشط",
  "pipeline.wonValue": "قيمة الصفقات المكتملة",
  "pipeline.stuckCount": "عالقة",
  "pipeline.collapseColumn": "طي العمود",
  "pipeline.expandColumn": "توسيع العمود",
  "pipeline.dealWon": "🎉 مبروك! تم إغلاق الصفقة",
  "pipeline.emptyBoard": "لا توجد صفقات بعد.",
  "pipeline.emptyBoardHint": "عند إضافة عملاء محتملين ستظهر بطاقاتهم هنا مباشرة.",
  "pipeline.stageNotEmpty": "المرحلة غير فارغة — انقل البطاقات أولاً",
  "pipeline.saveFailed": "تعذر الحفظ",
  "pipeline.stageSaved": "تم حفظ المرحلة",
  "pipeline.stageAdded": "تمت إضافة المرحلة",
  "pipeline.stageDeleted": "تم حذف المرحلة",
  "pipeline.stageColor": "لون المرحلة",
  "pipeline.stageNameAr": "اسم المرحلة (عربي)",
  "pipeline.stageNameEn": "Stage name (EN)",
  "pipeline.wonStage": "مرحلة الفوز",
  "pipeline.terminalStage": "مرحلة نهائية",
  "pipeline.moveUp": "تحريك لأعلى",
  "pipeline.moveDown": "تحريك لأسفل",
  "pipeline.save": "حفظ",
  "pipeline.delete": "حذف",
  "pipeline.deleteMoveTo": "نقل البطاقات إلى",
  "pipeline.confirmDelete": "تأكيد الحذف",
  "pipeline.close": "إغلاق",
  "pipeline.addStage": "إضافة مرحلة",
};

/** t() with a local fallback: never render a raw "pipeline.*" key. */
function tr(key: string): string {
  const value = t(key);
  if (value === key || !value) {
    return PIPELINE_FALLBACKS[key] ?? key;
  }
  return value;
}

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

function isStuck(lead: BoardLead): boolean {
  const hours = hoursInStage(lead);
  return hours !== null && hours >= DEFAULT_STUCK_DEAL_HOURS;
}

/**
 * Compact time-in-stage label.
 * Never renders "0س": under an hour we show minutes ("40د") or "الآن".
 * The full "في المرحلة" context lives in the title attribute.
 */
function timeInStageLabel(hours: number): string {
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}${tr("pipeline.daysShort")}`;
  }
  if (hours >= 1) {
    return `${Math.floor(hours)}${tr("pipeline.hoursShort")}`;
  }
  const minutes = Math.floor(hours * 60);
  if (minutes >= 1) {
    return `${minutes}${tr("pipeline.minutesShort")}`;
  }
  return tr("pipeline.justNow");
}

/** Arabic relative time for "last update": "منذ ٥ دقائق", "أمس", … */
const RELATIVE_AR = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
const DATE_AR = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "short",
});

function relativeUpdatedLabel(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const diffMinutes = Math.round((then - Date.now()) / 60_000);
  if (Math.abs(diffMinutes) < 60) {
    return RELATIVE_AR.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return RELATIVE_AR.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return RELATIVE_AR.format(diffDays, "day");
  }
  return DATE_AR.format(then);
}

function initials(name: string | null): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

/** Deterministic avatar tint per lead, so a person keeps the same color. */
const AVATAR_TINTS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
] as const;

function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]!;
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

function PriorityPill({ priority }: { priority: BoardLead["priority"] }) {
  if (priority === LEAD_PRIORITIES.URGENT) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
        {LEAD_PRIORITY_LABELS.urgent.ar}
      </span>
    );
  }
  if (priority === LEAD_PRIORITIES.HIGH) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        {LEAD_PRIORITY_LABELS.high.ar}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {tr("pipeline.priorityNormal")}
    </span>
  );
}

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
  const hasValue = lead.estimatedValue !== null && lead.estimatedValue > 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 transition-all duration-200",
        stuck ? "border-amber-300/70" : "border-border",
        overlay
          ? "rotate-2 shadow-lg"
          : "hover:-translate-y-px hover:border-border/80 hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.14)]",
      )}
    >
      {/* Top row: priority + reference */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <PriorityPill priority={lead.priority} />
        {lead.reference && (
          <span className="text-[10px] tabular-nums text-muted-foreground/70">
            #{lead.reference}
          </span>
        )}
      </div>

      {/* Customer: avatar + name + request line */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
            avatarTint(lead.name ?? lead.id),
          )}
          aria-hidden
        >
          {initials(lead.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {lead.name ?? tr("pipeline.unknownLead")}
          </p>
          {lead.listingTitle && (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
              {lead.listingTitle}
            </p>
          )}
        </div>
      </div>

      {/* Property chips: value + source */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hasValue && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
            {formatValue(lead.estimatedValue!)}
          </span>
        )}
        <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          <SourceIcon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{leadSourceLabelAr(lead.source)}</span>
        </span>
      </div>

      {/* Footer: time-in-stage / stuck badge + last update + assignee */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {hours !== null &&
            (stuck ? (
              <span
                title={`${tr("pipeline.stuckDeal")} · ${tr("pipeline.inStage")}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-700"
              >
                <Clock3 className="h-3 w-3" aria-hidden />
                {tr("pipeline.stuckDeal")} · {timeInStageLabel(hours)}
              </span>
            ) : (
              <span
                title={tr("pipeline.inStage")}
                className="inline-flex shrink-0 items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground/80"
              >
                <Clock3 className="h-3 w-3 opacity-60" aria-hidden />
                {timeInStageLabel(hours)}
              </span>
            ))}
          {lead.updatedAt && (
            <span
              className="truncate text-[10px] text-muted-foreground/70"
              title={tr("pipeline.lastUpdate")}
            >
              {relativeUpdatedLabel(lead.updatedAt)}
            </span>
          )}
        </div>
        {lead.assignedToName && (
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              avatarTint(lead.assignedToName),
            )}
            title={lead.assignedToName}
          >
            {initials(lead.assignedToName)}
          </span>
        )}
      </div>
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
      className={cn(
        "cursor-grab touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isDragging && "opacity-40",
      )}
      onClick={() => onOpen(lead)}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

/**
 * Collapsed rail: a slim vertical strip that stays a valid drop target,
 * so terminal stages (مفقود/صفقة) can be tucked away without losing the
 * ability to drag a card onto them to close it.
 */
function CollapsedColumn({
  stage,
  count,
  onExpand,
}: {
  stage: PipelineStage;
  count: number;
  onExpand: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${COLUMN_PREFIX}${stage.key}`,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onExpand}
      aria-label={`${tr("pipeline.expandColumn")}: ${stage.labelAr}`}
      className={cn(
        "flex max-h-full w-12 shrink-0 flex-col items-center gap-2 rounded-xl border border-border bg-muted/40 py-3 transition-colors hover:bg-muted/70",
        isOver && "bg-primary/5 ring-1 ring-inset ring-primary/20",
      )}
      style={{ borderTop: `3px solid ${stage.color}` }}
    >
      <span
        className="rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
        style={{ backgroundColor: `${stage.color}1f`, color: stage.color }}
      >
        {count}
      </span>
      <span
        className="text-[12px] font-semibold text-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        {stage.labelAr}
      </span>
      <Maximize2
        className="mt-auto h-3.5 w-3.5 text-muted-foreground/60"
        aria-hidden
      />
    </button>
  );
}

function BoardColumn({
  stage,
  leads,
  hiddenCount,
  onOpen,
  onCollapse,
}: {
  stage: PipelineStage;
  leads: BoardLead[];
  /** Leads in this stage hidden by the active filters. */
  hiddenCount: number;
  onOpen: (lead: BoardLead) => void;
  onCollapse: () => void;
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
      className="flex max-h-full w-[85vw] max-w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/40 sm:w-[290px] sm:max-w-none"
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
            title={
              hiddenCount > 0
                ? `${leads.length + hiddenCount} ${tr("pipeline.total")}`
                : undefined
            }
          >
            {leads.length}
            {hiddenCount > 0 && (
              <span className="opacity-60">/{leads.length + hiddenCount}</span>
            )}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {totalValue > 0 && (
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: stage.color }}
              title={tr("pipeline.totalValue")}
            >
              {formatValue(totalValue)}
            </span>
          )}
          <button
            type="button"
            onClick={onCollapse}
            aria-label={`${tr("pipeline.collapseColumn")}: ${stage.labelAr}`}
            className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-black/5 hover:text-muted-foreground"
          >
            <Minimize2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0 transition-colors",
          isOver && "rounded-b-xl bg-primary/5 ring-1 ring-inset ring-primary/20",
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
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center transition-colors",
              isOver
                ? "border-primary/40 bg-primary/5"
                : "border-border/70",
            )}
          >
            <Layers
              className="h-4 w-4 text-muted-foreground/50"
              aria-hidden
            />
            <p className="text-[11px] text-muted-foreground/70">
              {hiddenCount > 0
                ? tr("pipeline.allFilteredOut")
                : tr("pipeline.emptyColumn")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters toolbar
// ---------------------------------------------------------------------------

interface BoardFilters {
  query: string;
  highOnly: boolean;
  stuckOnly: boolean;
  assignee: string; // "" = all, UNASSIGNED = no assignee, else exact name
}

const EMPTY_FILTERS: BoardFilters = {
  query: "",
  highOnly: false,
  stuckOnly: false,
  assignee: "",
};

function filtersActive(f: BoardFilters): boolean {
  return f.query.trim() !== "" || f.highOnly || f.stuckOnly || f.assignee !== "";
}

function leadMatches(lead: BoardLead, f: BoardFilters): boolean {
  if (
    f.highOnly &&
    lead.priority !== LEAD_PRIORITIES.URGENT &&
    lead.priority !== LEAD_PRIORITIES.HIGH
  ) {
    return false;
  }
  if (f.stuckOnly && !isStuck(lead)) {
    return false;
  }
  if (f.assignee === UNASSIGNED) {
    if (lead.assignedToName) return false;
  } else if (f.assignee && lead.assignedToName !== f.assignee) {
    return false;
  }
  const q = f.query.trim().toLowerCase();
  if (q) {
    const haystack = `${lead.name ?? ""} ${lead.listingTitle ?? ""} ${
      lead.reference ?? ""
    }`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function FilterChip({
  active,
  activeClass,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
        active
          ? activeClass
          : "border-border bg-card text-muted-foreground hover:bg-muted/60",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function FiltersBar({
  filters,
  assignees,
  hasUnassigned,
  searchRef,
  onChange,
}: {
  filters: BoardFilters;
  assignees: string[];
  hasUnassigned: boolean;
  searchRef?: RefObject<HTMLInputElement | null>;
  onChange: (next: BoardFilters) => void;
}) {
  const active = filtersActive(filters);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60"
          aria-hidden
        />
        <input
          ref={searchRef}
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder={tr("pipeline.searchPlaceholder")}
          aria-label={tr("pipeline.searchPlaceholder")}
          className="h-9 w-56 rounded-md border border-border bg-card ps-8 pe-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <FilterChip
        active={filters.highOnly}
        activeClass="border-amber-300 bg-amber-50 text-amber-700"
        icon={Flame}
        label={tr("pipeline.highPriorityOnly")}
        onClick={() => onChange({ ...filters, highOnly: !filters.highOnly })}
      />

      <FilterChip
        active={filters.stuckOnly}
        activeClass="border-amber-300 bg-amber-50 text-amber-700"
        icon={Clock3}
        label={tr("pipeline.stuckOnly")}
        onClick={() => onChange({ ...filters, stuckOnly: !filters.stuckOnly })}
      />

      {(assignees.length > 0 || hasUnassigned) && (
        <select
          value={filters.assignee}
          onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
          aria-label={tr("pipeline.filterByAssignee")}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <option value="">{tr("pipeline.allAssignees")}</option>
          {hasUnassigned && (
            <option value={UNASSIGNED}>{tr("pipeline.unassigned")}</option>
          )}
          {assignees.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}

      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <X />
          {tr("pipeline.clearFilters")}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------

function StatsStrip({
  activeValue,
  wonValue,
  stuckCount,
  stuckActive,
  onToggleStuck,
}: {
  activeValue: number;
  wonValue: number;
  stuckCount: number;
  stuckActive: boolean;
  onToggleStuck: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeValue > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-primary">
          <Wallet className="h-3.5 w-3.5" aria-hidden />
          {tr("pipeline.pipelineValue")}: {formatValue(activeValue)}
        </span>
      )}
      {wonValue > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-700">
          <Trophy className="h-3.5 w-3.5" aria-hidden />
          {tr("pipeline.wonValue")}: {formatValue(wonValue)}
        </span>
      )}
      {stuckCount > 0 && (
        <button
          type="button"
          onClick={onToggleStuck}
          aria-pressed={stuckActive}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors",
            stuckActive
              ? "bg-amber-200 text-amber-900"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100",
          )}
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {stuckCount} {tr("pipeline.stuckCount")}
        </button>
      )}
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
          toast.error(tr("pipeline.stageNotEmpty"));
          return false;
        }
        toast.error(data.error || tr("pipeline.saveFailed"));
        return false;
      }
      if (Array.isArray(data.stages)) onStagesChanged(data.stages);
      return true;
    } catch {
      toast.error(tr("pipeline.saveFailed"));
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
      toast.success(tr("pipeline.stageSaved"));
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
      toast.success(tr("pipeline.stageAdded"));
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
      toast.success(tr("pipeline.stageDeleted"));
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
      title={tr("pipeline.manageStages")}
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          {tr("pipeline.close")}
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
                  aria-label={tr("pipeline.stageColor")}
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
                  aria-label={tr("pipeline.stageNameAr")}
                  className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
                />
                <input
                  value={draft.labelEn ?? stage.labelEn}
                  onChange={(e) =>
                    setDraft(stage.id, { labelEn: e.target.value })
                  }
                  aria-label={tr("pipeline.stageNameEn")}
                  dir="ltr"
                  className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
                />
                {stage.wonStage && (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {tr("pipeline.wonStage")}
                  </span>
                )}
                {stage.isTerminal && !stage.wonStage && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {tr("pipeline.terminalStage")}
                  </span>
                )}
                <div className="ms-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tr("pipeline.moveUp")}
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tr("pipeline.moveDown")}
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
                      {tr("pipeline.save")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={tr("pipeline.delete")}
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
                    {tr("pipeline.deleteMoveTo")}
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
                    {tr("pipeline.confirmDelete")}
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
            placeholder={tr("pipeline.stageNameAr")}
            className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
          />
          <input
            value={newLabelEn}
            onChange={(e) => setNewLabelEn(e.target.value)}
            placeholder={tr("pipeline.stageNameEn")}
            dir="ltr"
            className="h-9 w-36 min-w-0 rounded-md border border-border bg-card px-2 text-sm"
          />
          <Button
            size="sm"
            disabled={busy || newLabelAr.trim().length < 2}
            onClick={() => void addStage()}
          >
            <Plus />
            {tr("pipeline.addStage")}
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
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dragSnapshot = useRef<Columns | null>(null);
  // A drop also fires a click on the card — swallow that one.
  const suppressClick = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box from anywhere on the board.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const collapseStorageKey = `pipeline:collapsed:${companyId}`;

  // Restore collapsed columns from the last visit.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(collapseStorageKey);
      if (raw) {
        const keys = JSON.parse(raw) as unknown;
        if (Array.isArray(keys)) {
          setCollapsed(new Set(keys.filter((k) => typeof k === "string")));
        }
      }
    } catch {
      // localStorage unavailable — collapse state just won't persist.
    }
  }, [collapseStorageKey]);

  const toggleCollapsed = useCallback(
    (stageKey: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(stageKey)) next.delete(stageKey);
        else next.add(stageKey);
        try {
          window.localStorage.setItem(
            collapseStorageKey,
            JSON.stringify([...next]),
          );
        } catch {
          // Non-fatal.
        }
        return next;
      });
    },
    [collapseStorageKey],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const loadBoard = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/pipeline/board`);
      const data = (await res.json().catch(() => ({}))) as {
        stages?: PipelineStage[];
        columns?: Columns;
        error?: string;
      };
      if (!res.ok || !Array.isArray(data.stages)) {
        toast.error(data.error || tr("pipeline.loadFailed"));
        return;
      }
      setStages(data.stages);
      setColumns(data.columns ?? {});
    } catch {
      toast.error(tr("pipeline.loadFailed"));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  // Keep the board fresh for multi-agent teams: silent refresh every 60s
  // while the tab is visible, paused during drags and open modals so we
  // never clobber optimistic state mid-interaction.
  useEffect(() => {
    const canRefresh = () =>
      document.visibilityState === "visible" &&
      dragSnapshot.current === null &&
      !managerOpen &&
      detailsLead === null;

    const interval = window.setInterval(() => {
      if (canRefresh()) void loadBoard({ silent: true });
    }, 60_000);

    const onVisibilityChange = () => {
      if (canRefresh()) void loadBoard({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadBoard, managerOpen, detailsLead]);

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

  // Filtered view of the board. Drag & drop stays enabled while filtering;
  // drop positions are computed against the visible neighbours.
  const isFiltering = filtersActive(filters);

  const visibleColumns = useMemo<Columns>(() => {
    if (!isFiltering) return columns;
    const out: Columns = {};
    for (const [key, leads] of Object.entries(columns)) {
      out[key] = leads.filter((l) => leadMatches(l, filters));
    }
    return out;
  }, [columns, filters, isFiltering]);

  const { assignees, hasUnassigned } = useMemo(() => {
    const names = new Set<string>();
    let unassigned = false;
    for (const leads of Object.values(columns)) {
      for (const lead of leads) {
        if (lead.assignedToName) names.add(lead.assignedToName);
        else unassigned = true;
      }
    }
    return {
      assignees: [...names].sort((a, b) => a.localeCompare(b, "ar")),
      hasUnassigned: unassigned,
    };
  }, [columns]);

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

      // Index the card should land at, measured against the *visible* cards
      // in the target column (what the user is actually looking at).
      const targetLeads = visibleColumns[toColumn] ?? [];
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

      // Celebrate closing a deal into the won stage.
      if (fromColumn !== toColumn) {
        const targetStage = stages.find((s) => s.key === toColumn);
        if (targetStage?.wonStage) {
          toast.success(tr("pipeline.dealWon"));
        }
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
        const nextTarget = [...target, updated];
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
          toast.error(tr("pipeline.moveFailed"));
        }
      })();
    },
    [columns, companyId, resolveOverColumn, stages, visibleColumns],
  );

  // Active (non-terminal) leads — the headline count.
  const openCount = useMemo(() => {
    return stages
      .filter((s) => !s.isTerminal)
      .reduce((sum, s) => sum + (columns[s.key]?.length ?? 0), 0);
  }, [stages, columns]);

  // Every lead on the board, terminal stages included.
  const totalCount = useMemo(() => {
    return Object.values(columns).reduce((sum, l) => sum + l.length, 0);
  }, [columns]);

  const visibleCount = useMemo(() => {
    return Object.values(visibleColumns).reduce((sum, l) => sum + l.length, 0);
  }, [visibleColumns]);

  // Board-level stats: active pipeline value, won value, stuck deals.
  const { activeValue, wonValue, stuckCount } = useMemo(() => {
    let active = 0;
    let won = 0;
    let stuck = 0;
    for (const stage of stages) {
      const leads = columns[stage.key] ?? [];
      for (const lead of leads) {
        const value = lead.estimatedValue ?? 0;
        if (stage.wonStage) {
          won += value;
        } else if (!stage.isTerminal) {
          active += value;
          if (isStuck(lead)) stuck += 1;
        }
      }
    }
    return { activeValue: active, wonValue: won, stuckCount: stuck };
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
        <span className="sr-only">{tr("pipeline.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{openCount}</span>{" "}
          {tr("pipeline.activeLeads")}
          {totalCount > openCount && (
            <span className="text-muted-foreground/70">
              {" · "}
              {totalCount} {tr("pipeline.total")}
            </span>
          )}
          {isFiltering && (
            <span className="text-muted-foreground/70">
              {" · "}
              {visibleCount} {tr("pipeline.matchingFilters")}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadBoard()}
            aria-label={tr("pipeline.refresh")}
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
              {tr("pipeline.manageStages")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <FiltersBar
          filters={filters}
          assignees={assignees}
          hasUnassigned={hasUnassigned}
          searchRef={searchRef}
          onChange={setFilters}
        />
        <StatsStrip
          activeValue={activeValue}
          wonValue={wonValue}
          stuckCount={stuckCount}
          stuckActive={filters.stuckOnly}
          onToggleStuck={() =>
            setFilters((prev) => ({ ...prev, stuckOnly: !prev.stuckOnly }))
          }
        />
      </div>

      {!loading && totalCount === 0 && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          <Inbox
            className="h-4 w-4 shrink-0 text-muted-foreground/60"
            aria-hidden
          />
          <span>
            <span className="font-semibold text-foreground">
              {tr("pipeline.emptyBoard")}
            </span>{" "}
            {tr("pipeline.emptyBoardHint")}
          </span>
        </div>
      )}

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
          {stages.map((stage) => {
            const visible = visibleColumns[stage.key] ?? [];
            const total = columns[stage.key]?.length ?? 0;
            if (collapsed.has(stage.key)) {
              return (
                <CollapsedColumn
                  key={stage.key}
                  stage={stage}
                  count={total}
                  onExpand={() => toggleCollapsed(stage.key)}
                />
              );
            }
            return (
              <BoardColumn
                key={stage.key}
                stage={stage}
                leads={visible}
                hiddenCount={Math.max(0, total - visible.length)}
                onOpen={openDetails}
                onCollapse={() => toggleCollapsed(stage.key)}
              />
            );
          })}
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
