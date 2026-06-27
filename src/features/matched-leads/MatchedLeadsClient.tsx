"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, Target } from "lucide-react";
import {
  LISTING_TYPE_LABELS,
  LISTING_CATEGORY_LABELS,
  type ListingType,
  type ListingCategory,
} from "@/constants/listing-categories";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

interface MatchedLead {
  id: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    preferredContactMethod: string | null;
  };
  criteria: {
    q?: string;
    type?: string;
    category?: string;
    region?: string;
    city?: string;
    district?: string;
    bedrooms?: number;
    minPrice?: number;
    maxPrice?: number;
  };
  score: number;
  matchedListing: {
    id: string;
    title: string;
    price: number;
    currency: string;
    city: string;
    coverImage: string;
  };
  searchCount: number;
  lastSearchedAt: string | null;
}

const THRESHOLDS = [50, 65, 80] as const;

function fmtPrice(n: number): string {
  return `${n.toLocaleString("en-US")} ر.س`;
}

function scoreClasses(score: number): string {
  if (score >= 80) return "bg-success/15 text-success";
  if (score >= 65) return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
}

/** Human-readable chips describing what the customer searched for. */
function criteriaChips(c: MatchedLead["criteria"]): string[] {
  const chips: string[] = [];
  if (c.type) chips.push(LISTING_TYPE_LABELS[c.type as ListingType]?.ar ?? c.type);
  if (c.category) {
    chips.push(
      LISTING_CATEGORY_LABELS[c.category as ListingCategory]?.ar ?? c.category,
    );
  }
  if (c.city) chips.push(c.city);
  if (c.district) chips.push(c.district);
  else if (c.region) chips.push(c.region);
  if (c.bedrooms != null) chips.push(`${c.bedrooms} غرف`);
  if (c.minPrice != null || c.maxPrice != null) {
    const lo = c.minPrice != null ? c.minPrice.toLocaleString("en-US") : "";
    const hi = c.maxPrice != null ? c.maxPrice.toLocaleString("en-US") : "";
    chips.push(lo && hi ? `${lo}–${hi} ر.س` : hi ? `حتى ${hi} ر.س` : `من ${lo} ر.س`);
  }
  if (c.q) chips.push(`"${c.q}"`);
  return chips;
}

export function MatchedLeadsClient({ companyId }: { companyId: string }) {
  const { loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<MatchedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [min, setMin] = useState<number>(50);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/companies/${companyId}/matched-leads?min=${min}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<{ leads: MatchedLead[] }>;
      })
      .then((data) => {
        if (active) setLeads(data.leads);
      })
      .catch(() => {
        if (active) setError("تعذّر تحميل العملاء المطابقين.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyId, min, authLoading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.customer.name.toLowerCase().includes(q) ||
        l.customer.phone.includes(q),
    );
  }, [leads, search]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الجوال…"
          className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30 sm:w-auto"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>أدنى تطابق:</span>
          {THRESHOLDS.map((th) => (
            <button
              key={th}
              type="button"
              onClick={() => setMin(th)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                min === th
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {th}%
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            لا يوجد عملاء مطابقون لمخزونك الحالي عند هذا الحد. انشر عقارات أكثر
            أو خفّض نسبة التطابق.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">العميل</th>
                <th className="px-4 py-3 text-start font-semibold">بحث عن</th>
                <th className="px-4 py-3 text-start font-semibold">التطابق</th>
                <th className="px-4 py-3 text-start font-semibold">أقرب عقار</th>
                <th className="px-4 py-3 text-start font-semibold">تواصل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-foreground">
                      {lead.customer.name || "عميل"}
                    </div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {lead.customer.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {criteriaChips(lead.criteria).map((chip, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                        scoreClasses(lead.score),
                      )}
                    >
                      {lead.score}%
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">
                      {lead.matchedListing.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmtPrice(lead.matchedListing.price)}
                      {lead.matchedListing.city
                        ? ` · ${lead.matchedListing.city}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      {lead.customer.phone && (
                        <a
                          href={`tel:${lead.customer.phone}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="اتصال"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {lead.customer.phone && (
                        <a
                          href={`https://wa.me/${lead.customer.phone.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-success transition-colors hover:bg-success/10"
                          aria-label="واتساب"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
