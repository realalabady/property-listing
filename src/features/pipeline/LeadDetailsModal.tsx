"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  History,
  Loader2,
  Phone,
  Send,
  StickyNote,
  User2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  leadSourceLabelAr,
  type LeadPriority,
} from "@/constants/listing-categories";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import type { BoardLead } from "@/types/pipeline";

interface LeadNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  actorId: string | null;
  actorName: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

interface LeadDetailsModalProps {
  companyId: string;
  lead: BoardLead;
  open: boolean;
  onClose: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeNotes(value: unknown): LeadNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      authorId: typeof item.authorId === "string" ? item.authorId : "",
      authorName:
        typeof item.authorName === "string" ? item.authorName : "-",
      text: typeof item.text === "string" ? item.text : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    }))
    .filter((item) => item.id.length > 0);
}

function normalizeEvents(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      type: typeof item.type === "string" ? item.type : "event",
      actorId: typeof item.actorId === "string" ? item.actorId : null,
      actorName:
        typeof item.actorName === "string" ? item.actorName : "System",
      message: typeof item.message === "string" ? item.message : "",
      metadata:
        typeof item.metadata === "object" && item.metadata !== null
          ? (item.metadata as Record<string, unknown>)
          : null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    }))
    .filter((item) => item.id.length > 0);
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground" dir="auto">
        {value}
      </p>
    </div>
  );
}

/**
 * Card drill-down: lead metadata (created / last update / stage entry),
 * team notes with a composer, and the full activity timeline — the audit
 * trail of every create/assign/stage-change/note on this lead.
 */
export function LeadDetailsModal({
  companyId,
  lead,
  open,
  onClose,
}: LeadDetailsModalProps) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [priority, setPriority] = useState<LeadPriority | null>(lead.priority);
  const [savingPriority, setSavingPriority] = useState(false);

  const base = `/api/companies/${companyId}/leads/${lead.id}`;

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, timelineRes] = await Promise.all([
        fetch(`${base}/notes`),
        fetch(`${base}/timeline`),
      ]);
      const notesData = (await notesRes.json().catch(() => ({}))) as {
        notes?: unknown;
      };
      const timelineData = (await timelineRes.json().catch(() => ({}))) as {
        events?: unknown;
      };
      if (!notesRes.ok || !timelineRes.ok) {
        toast.error(t("pipeline.detailsFailed"));
        return;
      }
      setNotes(normalizeNotes(notesData.notes));
      setEvents(normalizeEvents(timelineData.events));
    } catch {
      toast.error(t("pipeline.detailsFailed"));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (!open) return;
    setNotes([]);
    setEvents([]);
    setNoteText("");
    setPriority(lead.priority);
    void loadDetails();
  }, [open, loadDetails, lead.priority]);

  const changePriority = async (next: LeadPriority | null) => {
    if (next === priority || savingPriority) return;
    const previous = priority;
    setPriority(next); // optimistic
    setSavingPriority(true);
    try {
      const res = await fetch(`${base}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
      if (!res.ok) throw new Error("priority_failed");
      toast.success(t("pipeline.priorityUpdated"));
      await loadDetails(); // the change lands on the audit trail too
    } catch {
      setPriority(previous);
      toast.error(t("pipeline.priorityFailed"));
    } finally {
      setSavingPriority(false);
    }
  };

  const submitNote = async () => {
    const text = noteText.trim();
    if (text.length < 2) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${base}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || t("pipeline.noteFailed"));
        return;
      }
      toast.success(t("pipeline.noteAdded"));
      setNoteText("");
      await loadDetails(); // note lands in both the list and the audit trail
    } catch {
      toast.error(t("pipeline.noteFailed"));
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead.name}
      description={lead.listingTitle ?? undefined}
      className="max-w-2xl"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          {t("pipeline.close")}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Meta: dates + ownership */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetaItem
            label={t("pipeline.created")}
            value={formatDateTime(lead.createdAt)}
          />
          <MetaItem
            label={t("pipeline.lastUpdate")}
            value={formatDateTime(lead.updatedAt)}
          />
          <MetaItem
            label={t("pipeline.stageEntered")}
            value={formatDateTime(lead.stageEnteredAt)}
          />
          <MetaItem
            label={t("pipeline.assignedTo")}
            value={lead.assignedToName ?? t("pipeline.unassigned")}
          />
          <MetaItem label={t("pipeline.phoneLabel")} value={lead.phone || "-"} />
          <MetaItem
            label={t("pipeline.sourceLabel")}
            value={leadSourceLabelAr(lead.source)}
          />
        </div>

        {/* Optional priority: segmented picker, null = بدون */}
        <section>
          <h3 className="text-sm font-semibold text-foreground">
            {t("pipeline.priority")}
          </h3>
          <div className="mt-2 inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                [null, t("pipeline.priorityNone")],
                [LEAD_PRIORITIES.NORMAL, LEAD_PRIORITY_LABELS.normal.ar],
                [LEAD_PRIORITIES.HIGH, LEAD_PRIORITY_LABELS.high.ar],
                [LEAD_PRIORITIES.URGENT, LEAD_PRIORITY_LABELS.urgent.ar],
              ] as Array<[LeadPriority | null, string]>
            ).map(([value, label]) => {
              const active = priority === value;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={savingPriority}
                  onClick={() => void changePriority(value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? value === LEAD_PRIORITIES.URGENT
                        ? "bg-destructive text-destructive-foreground"
                        : value === LEAD_PRIORITIES.HIGH
                          ? "bg-amber-500 text-white"
                          : "bg-card font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t("pipeline.notes")}
          </h3>

          <div className="mt-2 flex items-start gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("pipeline.notePlaceholder")}
              rows={2}
              maxLength={2000}
              className="min-h-[42px] flex-1 resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              className="mt-0.5"
              disabled={savingNote || noteText.trim().length < 2}
              onClick={() => void submitNote()}
            >
              {savingNote ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send />
              )}
              {t("pipeline.addNote")}
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {loading && notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("pipeline.loadingDetails")}
              </p>
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("pipeline.noNotes")}
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="whitespace-pre-wrap text-sm text-foreground" dir="auto">
                    {note.text}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User2 className="h-3 w-3" aria-hidden />
                    {note.authorName}
                    <span aria-hidden>·</span>
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Audit trail */}
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            {t("pipeline.audit")}
          </h3>
          <div className="mt-2">
            {loading && events.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("pipeline.loadingDetails")}
              </p>
            ) : events.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("pipeline.noAudit")}
              </p>
            ) : (
              <ol className="relative space-y-3 border-s border-border ps-4">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary"
                      aria-hidden
                    />
                    <p className="text-sm text-foreground" dir="auto">
                      {event.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {event.actorName}
                      <span aria-hidden> · </span>
                      {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            dir="ltr"
          >
            <Phone className="h-4 w-4" aria-hidden />
            {lead.phone}
          </a>
        )}
      </div>
    </Modal>
  );
}
