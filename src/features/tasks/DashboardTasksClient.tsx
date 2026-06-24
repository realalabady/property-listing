"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/constants/listing-categories";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  assignedToName: string;
  priority: string;
  status: string;
  dueDate: string | null;
  escalated: boolean;
  createdAt: string | null;
}

interface Employee {
  id: string;
  name: string;
  displayName?: string | null;
  email: string;
}

interface Props {
  companyId: string;
  currentUserId: string;
  canCreate: boolean;
  canAssign: boolean;
  canComplete: boolean;
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-secondary text-secondary-foreground",
};

function statusLabel(status: string): string {
  const map = TASK_STATUS_LABELS[status as TaskStatus];
  return map ? map.ar : status;
}

function priorityLabel(priority: string): string {
  const map = TASK_PRIORITY_LABELS[priority as TaskPriority];
  return map ? map.ar : priority;
}

function dueDiff(dueDate: string | null): string {
  if (!dueDate) return t("tasks.noDueDate");
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.floor(
    (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff < 0) return t("tasks.overdue");
  if (diff === 0) return t("tasks.today");
  if (diff === 1) return t("tasks.tomorrow");
  return t("tasks.inDays", { n: diff });
}

function isOverdueDate(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() - Date.now() < -0;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function prettifyEmailToName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return t("tasks.employeeFallback");

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveEmployeeLabel(employee: Employee): string {
  const name = typeof employee.name === "string" ? employee.name.trim() : "";
  if (name && !isEmailLike(name)) return name;

  const displayName =
    typeof employee.displayName === "string" ? employee.displayName.trim() : "";
  if (displayName && !isEmailLike(displayName)) return displayName;

  const email = typeof employee.email === "string" ? employee.email.trim() : "";
  if (email) return prettifyEmailToName(email);

  if (name) return name;
  if (displayName) return displayName;

  return t("tasks.employeeFallback");
}

export function DashboardTasksClient({
  companyId,
  currentUserId,
  canCreate,
  canAssign,
  canComplete,
}: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const employeeNameById = useMemo(() => {
    return new Map(
      employees.map((employee) => [
        employee.id,
        resolveEmployeeLabel(employee),
      ]),
    );
  }, [employees]);

  // Create task form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const assignRef = useRef<HTMLSelectElement>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(
        `/api/companies/${companyId}/tasks?${params.toString()}`,
      );
      if (!res.ok) throw new Error(t("tasks.loadFailed"));
      const data = (await res.json()) as { tasks: TaskRow[] };
      setTasks(data.tasks);
    } catch {
      setError(t("tasks.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter]);

  const loadEmployees = useCallback(async () => {
    if (!canAssign && !canCreate) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (!res.ok) return;
      const data = (await res.json()) as { employees: Employee[] };
      setEmployees(data.employees);
    } catch {
      // non-critical
    }
  }, [companyId, canAssign, canCreate]);

  useEffect(() => {
    void Promise.all([loadTasks(), loadEmployees()]);
  }, [loadTasks, loadEmployees]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const title = titleRef.current?.value.trim() ?? "";
    const dueDate = dueDateRef.current?.value ?? "";
    if (!title || !dueDate) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: descRef.current?.value.trim() || null,
          priority: priorityRef.current?.value ?? TASK_PRIORITIES.MEDIUM,
          dueDate: new Date(dueDate).toISOString(),
          assignedTo: assignRef.current?.value || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? t("tasks.createFailed"));
      }
      setShowCreate(false);
      await loadTasks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("tasks.createError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await fetch(`/api/companies/${companyId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
    } catch {
      // silent
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm(t("tasks.deleteConfirm"))) return;
    await fetch(`/api/companies/${companyId}/tasks/${taskId}`, {
      method: "DELETE",
    });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const canModifyStatus = canComplete || canCreate;

  const yourTasks = useMemo(
    () => tasks.filter((task) => task.assignedTo === currentUserId),
    [tasks, currentUserId],
  );

  const hasTasksOutsideMine = useMemo(
    () => tasks.some((task) => task.assignedTo !== currentUserId),
    [tasks, currentUserId],
  );

  function renderTaskCard(task: TaskRow) {
    const dueInfo = dueDiff(task.dueDate);
    const isOverdue = isOverdueDate(task.dueDate);
    const assigneeLabel = task.assignedTo
      ? employeeNameById.get(task.assignedTo) || task.assignedToName
      : task.assignedToName;

    return (
      <article
        key={task.id}
        className="flex flex-col rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold",
              PRIORITY_CLASS[task.priority] ??
                "bg-secondary text-secondary-foreground",
            )}
          >
            {priorityLabel(task.priority)}
          </span>
          <div className="flex items-center gap-1">
            {task.escalated && (
              <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                {t("tasks.escalated")}
              </span>
            )}
            {canCreate && (
              <button
                onClick={() => handleDelete(task.id)}
                className="ml-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug">
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="mt-auto space-y-1 pt-3">
          <p className="text-sm text-muted-foreground">
            {t("tasks.assignee")} {assigneeLabel}
          </p>
          <p
            className={cn(
              "text-sm",
              isOverdue
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
          >
            {t("tasks.due")} {dueInfo} ({formatDate(task.dueDate)})
          </p>

          {canModifyStatus ? (
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {Object.entries(TASK_STATUSES).map(([, v]) => (
                <option key={v} value={v}>
                  {statusLabel(v)}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 text-sm font-medium">
              {statusLabel(task.status)}
            </p>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("tasks.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("tasks.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("tasks.allStatuses")}</option>
            {Object.entries(TASK_STATUSES).map(([, v]) => (
              <option key={v} value={v}>
                {statusLabel(v)}
              </option>
            ))}
          </select>
          <button
            onClick={loadTasks}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            {t("tasks.refresh")}
          </button>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t("tasks.newTask")}
            </button>
          )}
        </div>
      </header>

      {/* Create modal */}
      {showCreate && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {t("tasks.newTaskTitle")}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("tasks.titleLabel")}
                </label>
                <input
                  ref={titleRef}
                  required
                  placeholder={t("tasks.titlePlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t("tasks.descriptionLabel")}
                </label>
                <textarea
                  ref={descRef}
                  rows={2}
                  placeholder={t("tasks.descriptionPlaceholder")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("tasks.priority")}
                  </label>
                  <select
                    ref={priorityRef}
                    defaultValue={TASK_PRIORITIES.MEDIUM}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(TASK_PRIORITIES).map(([, v]) => (
                      <option key={v} value={v}>
                        {priorityLabel(v)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("tasks.dueDateLabel")}
                  </label>
                  <input
                    ref={dueDateRef}
                    required
                    type="date"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {(canAssign || canCreate) && employees.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {t("tasks.assignTo")}
                  </label>
                  <select
                    ref={assignRef}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t("tasks.unassigned")}</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {resolveEmployeeLabel(e)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? t("tasks.creating") : t("tasks.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">{t("tasks.loading")}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && tasks.length === 0 && !error && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("tasks.noTasks")}{" "}
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="underline underline-offset-2"
            >
              {t("tasks.createFirst")}
            </button>
          )}
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("tasks.yourTasks")}</h3>
          <span className="text-xs text-muted-foreground">
            {yourTasks.length}
          </span>
        </div>

        {yourTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("tasks.noneAssigned")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {yourTasks.map((task) => renderTaskCard(task))}
          </div>
        )}
      </section>

      {hasTasksOutsideMine && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">{t("tasks.allTasks")}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => renderTaskCard(task))}
          </div>
        </section>
      )}
    </div>
  );
}
