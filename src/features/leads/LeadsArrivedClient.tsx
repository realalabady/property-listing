"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { LISTING_CATEGORY_LABELS } from "@/constants/listing-categories";
import { ROUTES } from "@/constants/routes";
import { SARPrice } from "@/components/ui/SARPrice";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface RequirementShape {
  intent?: string;
  propertyType?: string;
  region?: string;
  city?: string;
  district?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
  timeline?: string;
}

interface RequestRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  preferredContactMethod: string | null;
  requirement: RequirementShape | null;
  claimed: boolean;
  claimedLeadId: string | null;
  createdAt: string | null;
}

const INTENT_LABELS: Record<string, string> = {
  buy: "شراء",
  rent: "إيجار",
  invest: "استثمار",
  sell: "بيع",
};
const TIMELINE_LABELS: Record<string, string> = {
  immediate: "فوري",
  "1_3_months": "خلال 1–3 أشهر",
  browsing: "يتصفّح",
};

function categoryLabel(value?: string): string | null {
  if (!value) return null;
  const entry = (LISTING_CATEGORY_LABELS as Record<string, { ar: string }>)[
    value
  ];
  return entry ? entry.ar : value;
}

function locationText(r: RequirementShape): string {
  return [r.region, r.city, r.district].filter(Boolean).join(" • ");
}

export function LeadsArrivedClient({
  canManageLeads,
}: {
  canManageLeads: boolean;
}) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/lead-requests", { cache: "no-store" });
    const payload = (await res.json().catch(() => ({}))) as {
      requests?: RequestRow[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(payload.error || "تعذّر تحميل الطلبات الواردة.");
    }
    setRequests(Array.isArray(payload.requests) ? payload.requests : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "تعذّر تحميل الطلبات.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function claim(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/lead-requests/${id}/claim`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        leadId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || "تعذّر نقل الطلب.");
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, claimed: true, claimedLeadId: payload.leadId ?? null }
            : r,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر نقل الطلب.");
    } finally {
      setBusyId(null);
    }
  }

  const newCount = useMemo(
    () => requests.filter((r) => !r.claimed).length,
    [requests],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "جارٍ التحميل…"
            : `${newCount} طلب جديد من أصل ${requests.length}`}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load()
              .catch((e) =>
                setError(e instanceof Error ? e.message : "تعذّر التحديث."),
              )
              .finally(() => setLoading(false));
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          لا توجد طلبات واردة بعد. ستظهر هنا طلبات العملاء من الصفحة الرئيسية.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {requests.map((r) => {
          const req = r.requirement ?? {};
          const loc = locationText(req);
          const cat = categoryLabel(req.propertyType);
          const isRent = req.intent === "rent";
          return (
            <article
              key={r.id}
              className={cn(
                "rounded-xl border bg-card p-5",
                r.claimed ? "border-success/40" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">
                    {r.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.createdAt ? formatDate(r.createdAt) : ""}
                  </p>
                </div>
                {r.claimed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    تم النقل
                  </span>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    جديد
                  </span>
                )}
              </div>

              {/* Requirement chips */}
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {req.intent && (
                  <Chip>{INTENT_LABELS[req.intent] ?? req.intent}</Chip>
                )}
                {cat && <Chip>{cat}</Chip>}
                {req.bedrooms ? <Chip>{req.bedrooms} غرف</Chip> : null}
                {req.timeline && (
                  <Chip>{TIMELINE_LABELS[req.timeline] ?? req.timeline}</Chip>
                )}
              </div>

              {loc && (
                <p className="mt-2 text-sm text-muted-foreground">📍 {loc}</p>
              )}

              {(req.budgetMin != null || req.budgetMax != null) && (
                <p className="mt-1 text-sm font-medium text-foreground">
                  {isRent ? "الإيجار: " : "الميزانية: "}
                  {req.budgetMin != null && (
                    <SARPrice amount={req.budgetMin} />
                  )}
                  {req.budgetMin != null && req.budgetMax != null ? " – " : ""}
                  {req.budgetMax != null && (
                    <SARPrice amount={req.budgetMax} />
                  )}
                  {isRent ? " / شهرياً" : ""}
                </p>
              )}

              {r.message && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {r.message}
                </p>
              )}

              {/* Contact + actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${r.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {r.phone}
                </a>
                <a
                  href={`https://wa.me/${r.phone.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  واتساب
                </a>
                {r.email && (
                  <a
                    href={`mailto:${r.email}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    بريد
                  </a>
                )}

                <div className="ms-auto">
                  {r.claimed ? (
                    <Link
                      href={ROUTES.DASHBOARD_LEADS}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-success hover:underline"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      في عملائي
                    </Link>
                  ) : canManageLeads ? (
                    <button
                      type="button"
                      onClick={() => claim(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      {busyId === r.id ? "جارٍ النقل…" : "نقل إلى عملائي"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
      {children}
    </span>
  );
}
