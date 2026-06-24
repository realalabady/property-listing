"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/constants/listing-categories";
import { formatDate } from "@/lib/utils/format";
import { maskSensitive } from "@/lib/utils/validation";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  source: string;
  listingId: string | null;
  listingTitle: string;
  status: LeadStatus;
  nationalId: string | null;
  assignedTo: string | null;
  assignedToName: string;
  createdAt: string | null;
  updatedAt: string | null;
  responseTimeMinutes: number | null;
  firstResponseAt: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

interface LeadNoteRow {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface LeadTimelineEvent {
  id: string;
  type: string;
  actorId: string | null;
  actorName: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}


function statusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status].ar;
}

function normalizeLeadRows(value: unknown): LeadRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      name: typeof item.name === "string" ? item.name : t("leadsDash.unknown"),
      phone: typeof item.phone === "string" ? item.phone : "",
      email: typeof item.email === "string" ? item.email : "",
      message: typeof item.message === "string" ? item.message : null,
      source: typeof item.source === "string" ? item.source : "other",
      listingId: typeof item.listingId === "string" ? item.listingId : null,
      listingTitle:
        typeof item.listingTitle === "string"
          ? item.listingTitle
          : t("leadsDash.generalInquiry"),
      status:
        typeof item.status === "string" &&
        Object.values(LEAD_STATUSES).includes(item.status as LeadStatus)
          ? (item.status as LeadStatus)
          : LEAD_STATUSES.NEW,
      nationalId: typeof item.nationalId === "string" ? item.nationalId : null,
      assignedTo: typeof item.assignedTo === "string" ? item.assignedTo : null,
      assignedToName:
        typeof item.assignedToName === "string"
          ? item.assignedToName
          : t("leadsDash.unassigned"),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
      responseTimeMinutes:
        typeof item.responseTimeMinutes === "number"
          ? item.responseTimeMinutes
          : null,
      firstResponseAt:
        typeof item.firstResponseAt === "string" ? item.firstResponseAt : null,
    }))
    .filter((item) => item.id.length > 0);
}

function normalizeEmployees(value: unknown): EmployeeRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      name:
        typeof item.name === "string"
          ? item.name
          : t("dashPages.employeeFallback"),
      role: typeof item.role === "string" ? item.role : "viewer",
      active: item.active !== false,
    }))
    .filter((item) => item.id.length > 0 && item.active);
}

function normalizeNotes(value: unknown): LeadNoteRow[] {
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
        typeof item.authorName === "string"
          ? item.authorName
          : t("leadsDash.teamMember"),
      text: typeof item.text === "string" ? item.text : "",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    }))
    .filter((item) => item.id.length > 0);
}

function normalizeTimeline(value: unknown): LeadTimelineEvent[] {
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
        typeof item.actorName === "string"
          ? item.actorName
          : t("leadsDash.system"),
      message:
        typeof item.message === "string"
          ? item.message
          : t("leadsDash.activityFallback"),
      metadata:
        typeof item.metadata === "object" && item.metadata !== null
          ? (item.metadata as Record<string, unknown>)
          : null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    }))
    .filter((item) => item.id.length > 0);
}

async function parseResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getErrorMessage(
  payload: Record<string, unknown>,
  fallback: string,
): string {
  return typeof payload.error === "string" && payload.error.length > 0
    ? payload.error
    : fallback;
}

interface DashboardLeadsClientProps {
  companyId: string;
  canManageLeads: boolean;
  canAssignLeads: boolean;
  canCommentOnLeads: boolean;
  canViewNationalId: boolean;
}

export function DashboardLeadsClient({
  companyId,
  canManageLeads,
  canAssignLeads,
  canCommentOnLeads,
  canViewNationalId,
}: DashboardLeadsClientProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>(
    LEAD_STATUSES.CONTACTED,
  );
  const [bulkAssignedTo, setBulkAssignedTo] = useState<string>("");
  const [activityLead, setActivityLead] = useState<LeadRow | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [leadNotes, setLeadNotes] = useState<LeadNoteRow[]>([]);
  const [leadTimeline, setLeadTimeline] = useState<LeadTimelineEvent[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams({ limit: "150" });
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    const response = await fetch(
      `/api/companies/${companyId}/leads?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, t("leadsDash.loadFailed")));
    }

    setLeads(normalizeLeadRows(payload.leads));
  }, [companyId, statusFilter]);

  const loadEmployees = useCallback(async () => {
    if (!canAssignLeads) {
      setEmployees([]);
      return;
    }

    const response = await fetch(`/api/companies/${companyId}/employees`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 403) {
        setEmployees([]);
        return;
      }
      throw new Error(
        getErrorMessage(payload, t("leadsDash.loadEmployeesFailed")),
      );
    }

    setEmployees(normalizeEmployees(payload.employees));
  }, [canAssignLeads, companyId]);

  const loadLeadActivity = useCallback(
    async (leadId: string) => {
      const [notesResponse, timelineResponse] = await Promise.all([
        fetch(`/api/companies/${companyId}/leads/${leadId}/notes`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/companies/${companyId}/leads/${leadId}/timeline`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const notesPayload = await parseResponse(notesResponse);
      if (!notesResponse.ok) {
        throw new Error(
          getErrorMessage(notesPayload, t("leadsDash.loadNotesFailed")),
        );
      }

      const timelinePayload = await parseResponse(timelineResponse);
      if (!timelineResponse.ok) {
        throw new Error(
          getErrorMessage(timelinePayload, t("leadsDash.loadTimelineFailed")),
        );
      }

      setLeadNotes(normalizeNotes(notesPayload.notes));
      setLeadTimeline(normalizeTimeline(timelinePayload.events));
    },
    [companyId],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadLeads(), loadEmployees()]);
        if (cancelled) return;
        setNotice(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("leadsDash.loadFailed"),
        );
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadEmployees, loadLeads]);

  useEffect(() => {
    setSelectedLeadIds((prev) => {
      const allowedIds = new Set(leads.map((lead) => lead.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (allowedIds.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [leads]);

  async function refreshAll() {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([loadLeads(), loadEmployees()]);
      setNotice(t("leadsDash.dataRefreshed"));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : t("leadsDash.refreshFailed"),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => {
      return (
        lead.name.toLowerCase().includes(term) ||
        lead.phone.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.listingTitle.toLowerCase().includes(term) ||
        lead.source.toLowerCase().includes(term)
      );
    });
  }, [leads, search]);

  const visibleLeadIds = useMemo(
    () => filteredLeads.map((lead) => lead.id),
    [filteredLeads],
  );

  const selectedVisibleCount = useMemo(() => {
    let count = 0;
    for (const id of visibleLeadIds) {
      if (selectedLeadIds.has(id)) count += 1;
    }
    return count;
  }, [selectedLeadIds, visibleLeadIds]);

  const allVisibleSelected =
    visibleLeadIds.length > 0 && selectedVisibleCount === visibleLeadIds.length;

  const stats = useMemo(() => {
    const total = leads.length;
    const fresh = leads.filter((l) => l.status === LEAD_STATUSES.NEW).length;
    const qualified = leads.filter(
      (l) => l.status === LEAD_STATUSES.QUALIFIED,
    ).length;
    const deals = leads.filter((l) => l.status === LEAD_STATUSES.DEAL).length;

    return { total, fresh, qualified, deals };
  }, [leads]);

  async function updateLeadStatus(leadId: string, status: LeadStatus) {
    if (!canManageLeads) return;

    setBusyKey(`status:${leadId}`);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/leads/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "status",
          status,
          leadIds: [leadId],
        }),
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, t("leadsDash.statusUpdateFailed")),
        );
      }

      await loadLeads();
      if (activityLead?.id === leadId) {
        await loadLeadActivity(leadId);
      }
      setNotice(t("leadsDash.statusUpdated"));
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : t("leadsDash.statusUpdateFailed");
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function assignLead(leadId: string, assignedTo: string | null) {
    if (!canAssignLeads) return;

    setBusyKey(`assign:${leadId}`);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/leads/${leadId}/assign`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedTo,
          }),
        },
      );

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, t("leadsDash.assignFailed")));
      }

      await loadLeads();
      if (activityLead?.id === leadId) {
        await loadLeadActivity(leadId);
      }
      setNotice(t("leadsDash.assigneeUpdated"));
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : t("leadsDash.assignFailed"),
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function applyBulkStatus() {
    if (!canManageLeads || selectedLeadIds.size === 0) return;

    setBulkBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/leads/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "status",
          status: bulkStatus,
          leadIds: Array.from(selectedLeadIds),
        }),
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, t("leadsDash.bulkStatusFailed")),
        );
      }

      const updatedCount =
        typeof payload.updatedCount === "number"
          ? payload.updatedCount
          : selectedLeadIds.size;

      await loadLeads();
      setSelectedLeadIds(new Set());
      setNotice(t("leadsDash.bulkStatusDone", { n: updatedCount }));
    } catch (bulkError) {
      setError(
        bulkError instanceof Error
          ? bulkError.message
          : t("leadsDash.bulkStatusFailed"),
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function applyBulkAssignment() {
    if (!canAssignLeads || selectedLeadIds.size === 0) return;

    setBulkBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/leads/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "assign",
          assignedTo: bulkAssignedTo || null,
          leadIds: Array.from(selectedLeadIds),
        }),
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, t("leadsDash.bulkAssignFailed")),
        );
      }

      const updatedCount =
        typeof payload.updatedCount === "number"
          ? payload.updatedCount
          : selectedLeadIds.size;

      await loadLeads();
      setSelectedLeadIds(new Set());
      setNotice(t("leadsDash.bulkAssignDone", { n: updatedCount }));
    } catch (bulkError) {
      setError(
        bulkError instanceof Error
          ? bulkError.message
          : t("leadsDash.bulkAssignFailed"),
      );
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleLeadSelection(leadId: string, nextChecked: boolean) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) {
        next.add(leadId);
      } else {
        next.delete(leadId);
      }
      return next;
    });
  }

  function toggleSelectAllVisible(nextChecked: boolean) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      for (const leadId of visibleLeadIds) {
        if (nextChecked) {
          next.add(leadId);
        } else {
          next.delete(leadId);
        }
      }
      return next;
    });
  }

  async function openLeadActivity(lead: LeadRow) {
    setActivityLead(lead);
    setLeadNotes([]);
    setLeadTimeline([]);
    setNoteText("");
    setActivityLoading(true);
    setError(null);

    try {
      await loadLeadActivity(lead.id);
    } catch (activityError) {
      setError(
        activityError instanceof Error
          ? activityError.message
          : t("leadsDash.loadActivityFailed"),
      );
    } finally {
      setActivityLoading(false);
    }
  }

  async function addNote() {
    if (!activityLead || !canCommentOnLeads) return;

    const text = noteText.trim();
    if (text.length < 2) {
      setError(t("leadsDash.noteMin"));
      return;
    }

    setNoteBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/leads/${activityLead.id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        },
      );

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, t("leadsDash.addNoteFailed")));
      }

      setNoteText("");
      await Promise.all([loadLeadActivity(activityLead.id), loadLeads()]);
      setNotice(t("leadsDash.noteAdded"));
    } catch (noteError) {
      setError(
        noteError instanceof Error
          ? noteError.message
          : t("leadsDash.addNoteFailed"),
      );
    } finally {
      setNoteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          label={t("leadsDash.totalLeads")}
          value={String(stats.total)}
        />
        <MetricCard label={t("leadsDash.new")} value={String(stats.fresh)} />
        <MetricCard
          label={t("leadsDash.qualified")}
          value={String(stats.qualified)}
        />
        <MetricCard label={t("leadsDash.deals")} value={String(stats.deals)} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {t("leadsDash.pipelineTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("leadsDash.pipelineSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t("common.status")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | LeadStatus)
              }
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">{t("common.all")}</option>
              {Object.values(LEAD_STATUSES).map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("leadsDash.searchPlaceholder")}
              className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />

            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
            >
              {refreshing ? t("leadsDash.refreshing") : t("leadsDash.refresh")}
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div className="mt-4 space-y-3">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {notice}
              </div>
            )}
          </div>
        )}
      </section>

      {(canManageLeads || canAssignLeads) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-base font-semibold">
            {t("leadsDash.bulkActions")}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("leadsDash.selectedLeads", { n: selectedLeadIds.size })}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {canManageLeads && (
              <div className="rounded-lg border border-border bg-background p-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("leadsDash.setStatus")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkStatus}
                    onChange={(event) =>
                      setBulkStatus(event.target.value as LeadStatus)
                    }
                    className="w-full h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  >
                    {Object.values(LEAD_STATUSES).map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkBusy || selectedLeadIds.size === 0}
                    onClick={applyBulkStatus}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {t("leadsDash.apply")}
                  </button>
                </div>
              </div>
            )}

            {canAssignLeads && (
              <div className="rounded-lg border border-border bg-background p-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("leadsDash.assignToEmployee")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkAssignedTo}
                    onChange={(event) => setBulkAssignedTo(event.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  >
                    <option value="">{t("leadsDash.unassigned")}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkBusy || selectedLeadIds.size === 0}
                    onClick={applyBulkAssignment}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                  >
                    {t("leadsDash.apply")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-right text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        toggleSelectAllVisible(event.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-[11px] normal-case">
                      {selectedVisibleCount}
                    </span>
                  </label>
                </th>
                <th className="px-4 py-3">{t("leadsDash.colLead")}</th>
                <th className="px-4 py-3">{t("leadsDash.colNationalId")}</th>
                <th className="px-4 py-3">{t("leadsDash.colSource")}</th>
                <th className="px-4 py-3">{t("leadsDash.colListing")}</th>
                <th className="px-4 py-3">{t("leadsDash.colAssignee")}</th>
                <th className="px-4 py-3">{t("common.status")}</th>
                <th className="px-4 py-3">{t("leadsDash.colResponse")}</th>
                <th className="px-4 py-3">{t("leadsDash.colCreated")}</th>
                <th className="px-4 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={10}>
                    {t("leadsDash.loadingLeads")}
                  </td>
                </tr>
              )}

              {!loading && filteredLeads.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={10}>
                    {t("leadsDash.noLeads")}
                  </td>
                </tr>
              )}

              {filteredLeads.map((lead) => {
                const isStatusBusy = busyKey === `status:${lead.id}`;
                const isAssignBusy = busyKey === `assign:${lead.id}`;
                return (
                  <tr key={lead.id}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={(event) =>
                          toggleLeadSelection(lead.id, event.target.checked)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone}
                        {lead.email ? ` • ${lead.email}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {lead.nationalId
                        ? canViewNationalId
                          ? lead.nationalId
                          : maskSensitive(lead.nationalId, 4)
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {lead.source}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {lead.listingTitle}
                    </td>
                    <td className="px-4 py-4">
                      {canAssignLeads ? (
                        <select
                          disabled={isAssignBusy}
                          value={lead.assignedTo ?? ""}
                          onChange={(event) =>
                            assignLead(lead.id, event.target.value || null)
                          }
                          className="rounded-md border border-input bg-card px-2 py-1 text-xs"
                        >
                          <option value="">{t("leadsDash.unassigned")}</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {lead.assignedToName || t("leadsDash.unassigned")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {canManageLeads ? (
                        <select
                          disabled={isStatusBusy}
                          value={lead.status}
                          onChange={(e) =>
                            updateLeadStatus(
                              lead.id,
                              e.target.value as LeadStatus,
                            )
                          }
                          className={cn(
                            "rounded-md border border-input bg-card px-2 py-1 text-xs",
                            lead.status === LEAD_STATUSES.DEAL
                              ? "text-success"
                              : "text-foreground",
                          )}
                        >
                          {Object.values(LEAD_STATUSES).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold">
                          {statusLabel(lead.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {lead.responseTimeMinutes ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {lead.createdAt ? formatDate(lead.createdAt) : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openLeadActivity(lead)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-secondary"
                      >
                        {t("leadsDash.activity")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {activityLead && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold">
                {t("leadsDash.leadActivity")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {activityLead.name} • {activityLead.phone}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActivityLead(null);
                setLeadNotes([]);
                setLeadTimeline([]);
                setNoteText("");
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            >
              {t("common.close")}
            </button>
          </div>

          {activityLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("leadsDash.loadingActivity")}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-4">
                <h5 className="text-sm font-semibold">
                  {t("leadsDash.timeline")}
                </h5>
                <div className="mt-3 space-y-3">
                  {leadTimeline.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("leadsDash.noTimeline")}
                    </p>
                  )}

                  {leadTimeline.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-md border border-border p-3"
                    >
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actorName} •{" "}
                        {event.createdAt ? formatDate(event.createdAt) : "-"}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <h5 className="text-sm font-semibold">
                  {t("leadsDash.notes")}
                </h5>

                <div className="mt-3 space-y-3">
                  {leadNotes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("leadsDash.noNotes")}
                    </p>
                  )}

                  {leadNotes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-md border border-border p-3"
                    >
                      <p className="text-sm">{note.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {note.authorName} •{" "}
                        {note.createdAt ? formatDate(note.createdAt) : "-"}
                      </p>
                    </article>
                  ))}
                </div>

                {canCommentOnLeads && (
                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("leadsDash.addNote")}
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(event) => setNoteText(event.target.value)}
                      rows={3}
                      className="w-full h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                      placeholder={t("leadsDash.addNotePlaceholder")}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={noteBusy}
                        onClick={addNote}
                        className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                      >
                        {noteBusy ? t("common.saving") : t("leadsDash.addNote")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

