"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  taskId: string | null;
  leadId: string | null;
  read: boolean;
  createdAt: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return t("notifications.now");

  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return t("notifications.now");

  const diffMs = Date.now() - then;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 60)
    return t("notifications.secondsAgo", { n: diffSeconds });
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return t("notifications.minutesAgo", { n: diffMinutes });
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t("notifications.hoursAgo", { n: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t("notifications.daysAgo", { n: diffDays });
}

function targetHref(notification: NotificationItem): string {
  if (notification.taskId) return ROUTES.DASHBOARD_TASKS;
  if (notification.leadId) return ROUTES.DASHBOARD_LEADS;
  return ROUTES.DASHBOARD;
}

export function NotificationsButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items],
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/notifications`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) return;

      const payload = (await response.json()) as {
        notifications?: NotificationItem[];
      };
      setItems(
        Array.isArray(payload.notifications) ? payload.notifications : [],
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    const response = await fetch(`/api/companies/${companyId}/notifications`, {
      method: "PATCH",
    });
    if (!response.ok) return;

    setItems((prev) =>
      prev.map((item) =>
        item.read
          ? item
          : {
              ...item,
              read: true,
            },
      ),
    );
  }, [companyId, unreadCount]);

  useEffect(() => {
    void loadNotifications();

    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 180000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;

    void loadNotifications();
    void markAllRead();
  }, [open, loadNotifications, markAllRead]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("notifications.open")}
        title={t("notifications.label")}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-secondary"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[22rem] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">
              {t("notifications.yourNotifications")}
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {t("notifications.loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {t("notifications.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={targetHref(item)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-4 py-3 transition hover:bg-secondary/60",
                        !item.read && "bg-primary/5",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timeAgo(item.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
