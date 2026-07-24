"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { SARPrice } from "@/components/ui/SARPrice";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { formatDate } from "@/lib/utils/format";
import { isValidSaudiPhone } from "@/lib/utils/validation";
import {
  BID_SOURCE_VALUES,
  BID_SOURCE_LABELS,
  isValidBidSource,
} from "@/constants/bid-sources";
import type { AuctionSummary } from "./DashboardListingDetailClient";

interface BidRow {
  id: string;
  amount: number;
  employeeName: string;
  bidderName: string;
  bidderPhone: string;
  bidderSource: string;
  createdAt: Date | null;
}

interface AuctionPanelProps {
  companyId: string;
  listingId: string;
  /** Live summary from the parent listing snapshot (updates in real time). */
  auction: AuctionSummary | null;
  /** Asking price — the default starting bid when opening an auction. */
  askingPrice: number;
  /** Whether the current user may run the auction (manage_bids). */
  canManage: boolean;
  /** True once auth is ready so the bids listener can attach. */
  authReady: boolean;
}

/** datetime-local input value → epoch ms (local time), or undefined if empty. */
function localInputToMs(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function toDate(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Auction management surface on the listing detail page. The `auction` prop is
 * already live (parent listens to the listing doc); this component adds a live
 * listener on the `bids` subcollection for the history table, and the controls
 * that call the auction API routes.
 */
export function AuctionPanel({
  companyId,
  listingId,
  auction,
  askingPrice,
  canManage,
  authReady,
}: AuctionPanelProps) {
  const [bids, setBids] = useState<BidRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start-auction form
  const [startPrice, setStartPrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("");
  const [startEndsAt, setStartEndsAt] = useState("");
  // End-date editor (running auction)
  const [editEndsAt, setEditEndsAt] = useState("");
  // Place-bid form
  const [bidAmount, setBidAmount] = useState("");
  const [bidderName, setBidderName] = useState("");
  const [bidderPhone, setBidderPhone] = useState("");
  const [bidderSource, setBidderSource] = useState("");

  useEffect(() => {
    if (!authReady || !auction) return;
    const db = getFirebaseDb();
    const q = query(
      collection(db, `companies/${companyId}/listings/${listingId}/bids`),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: BidRow[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData;
          return {
            id: d.id,
            amount: typeof data.amount === "number" ? data.amount : 0,
            employeeName:
              typeof data.placedByEmployeeName === "string"
                ? data.placedByEmployeeName
                : "—",
            bidderName:
              typeof data.bidderName === "string" ? data.bidderName : "—",
            bidderPhone:
              typeof data.bidderPhone === "string" ? data.bidderPhone : "",
            bidderSource:
              typeof data.bidderSource === "string" ? data.bidderSource : "",
            createdAt: toDate(data.createdAt),
          };
        });
        setBids(rows);
      },
      () => setBids([]),
    );
    return () => unsub();
  }, [authReady, auction, companyId, listingId]);

  async function call(
    path: string,
    method: string,
    body: Record<string, unknown>,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/listings/${listingId}${path}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error || "تعذّر تنفيذ العملية.");
        return false;
      }
      return true;
    } catch {
      setError("تعذّر الاتصال بالخادم.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function startAuction() {
    const ok = await call("/auction", "POST", {
      startPrice: startPrice.trim() ? Number(startPrice) : undefined,
      minIncrement: minIncrement.trim() ? Number(minIncrement) : 0,
      endsAt: localInputToMs(startEndsAt),
    });
    if (ok) {
      setStartPrice("");
      setMinIncrement("");
      setStartEndsAt("");
    }
  }

  async function setEndsAt() {
    if (!editEndsAt.trim()) {
      setError("اختر تاريخ الانتهاء أولاً.");
      return;
    }
    const ok = await call("/auction", "PATCH", {
      endsAt: localInputToMs(editEndsAt),
    });
    if (ok) setEditEndsAt("");
  }

  async function clearEndsAt() {
    await call("/auction", "PATCH", { endsAt: null });
  }

  async function placeBid() {
    const amount = Number(bidAmount);
    if (!bidAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("أدخل قيمة مزايدة صالحة.");
      return;
    }
    if (bidderName.trim().length < 2) {
      setError("اسم المزايد مطلوب.");
      return;
    }
    if (!isValidSaudiPhone(bidderPhone)) {
      setError("رقم جوال المزايد غير صالح.");
      return;
    }
    if (!isValidBidSource(bidderSource)) {
      setError("حدد كيف وصل المزايد.");
      return;
    }
    const ok = await call("/auction/bids", "POST", {
      amount,
      bidderName: bidderName.trim(),
      bidderPhone: bidderPhone.trim(),
      bidderSource,
    });
    if (ok) {
      setBidAmount("");
      setBidderName("");
      setBidderPhone("");
      setBidderSource("");
    }
  }

  async function closeAuction() {
    await call("/auction", "PATCH", { action: "close" });
  }
  async function reopenAuction() {
    await call("/auction", "PATCH", { action: "reopen" });
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";
  const btnCls =
    "rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

  // ── No auction yet ────────────────────────────────────────────────────────
  if (!auction) {
    if (!canManage) {
      return (
        <p className="text-sm text-muted-foreground">
          لا توجد مزايدة على هذا العرض.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          فعّل المزايدة لبدء استقبال العروض على هذا العقار. سعر العرض الأصلي يبقى
          كما هو.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">
              سعر بداية المزايدة
            </span>
            <input
              type="number"
              min={1}
              className={inputCls}
              placeholder={`السعر الحالي: ${askingPrice.toLocaleString("en-US")}`}
              value={startPrice}
              onChange={(e) => setStartPrice(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">
              أقل زيادة (اختياري)
            </span>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="0"
              value={minIncrement}
              onChange={(e) => setMinIncrement(e.target.value)}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">
              تاريخ انتهاء المزايدة (اختياري — يُغلق تلقائيًا)
            </span>
            <input
              type="datetime-local"
              className={inputCls}
              value={startEndsAt}
              onChange={(e) => setStartEndsAt(e.target.value)}
            />
          </label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          className={btnCls}
          disabled={busy}
          onClick={startAuction}
        >
          بدء المزايدة
        </button>
      </div>
    );
  }

  // ── Active/closed auction ─────────────────────────────────────────────────
  // Effectively live only when open AND (no end date OR the end date is in the
  // future). Past the end date it's treated as ended — bids are also rejected
  // server-side, so this only mirrors that on screen.
  const expired = auction.endsAt != null && auction.endsAt <= Date.now();
  const isOpen = auction.status === "open";
  const isLive = isOpen && !expired;
  const hasBid = typeof auction.currentBid === "number";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">
            {hasBid ? "أعلى مزايدة" : "سعر البداية"}
          </p>
          <p className="text-2xl font-bold">
            <SARPrice amount={hasBid ? auction.currentBid! : auction.startPrice} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">عدد المزايدات</p>
          <p className="text-lg font-semibold">{auction.bidCount}</p>
        </div>
        {auction.highBidByEmployeeName && (
          <div>
            <p className="text-xs text-muted-foreground">صاحب أعلى مزايدة</p>
            <p className="text-sm font-medium">
              {auction.highBidByEmployeeName}
            </p>
          </div>
        )}
        {auction.endsAt != null && (
          <div>
            <p className="text-xs text-muted-foreground">
              {isLive ? "ينتهي خلال" : "تاريخ الانتهاء"}
            </p>
            <div className="mt-0.5 text-sm font-semibold">
              {isLive ? (
                <CountdownTimer endsAt={auction.endsAt} size="sm" />
              ) : (
                formatDate(new Date(auction.endsAt).toISOString())
              )}
            </div>
          </div>
        )}
        <span
          className={
            isLive
              ? "rounded-md bg-success/20 px-2 py-1 text-xs font-semibold text-success"
              : "rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground"
          }
        >
          {isLive ? "مفتوحة" : expired ? "منتهية" : "مغلقة"}
        </span>
      </div>

      {canManage && isLive && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">تسجيل مزايدة</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="number"
              min={1}
              className={inputCls}
              placeholder="قيمة المزايدة *"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <input
              type="text"
              className={inputCls}
              placeholder="اسم المزايد *"
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
            />
            <input
              type="tel"
              inputMode="tel"
              dir="ltr"
              className={inputCls}
              placeholder="جوال المزايد * (05…)"
              value={bidderPhone}
              onChange={(e) => setBidderPhone(e.target.value)}
            />
            <select
              className={`${inputCls} sm:col-span-3`}
              value={bidderSource}
              onChange={(e) => setBidderSource(e.target.value)}
            >
              <option value="">كيف وصل المزايد؟ *</option>
              {BID_SOURCE_VALUES.map((src) => (
                <option key={src} value={src}>
                  {BID_SOURCE_LABELS[src]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={btnCls}
            disabled={busy}
            onClick={placeBid}
          >
            تسجيل المزايدة
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* End-date editor — set / change / clear the auto-close time. */}
      {canManage && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">تاريخ انتهاء المزايدة</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className={`${inputCls} sm:max-w-xs`}
              value={editEndsAt}
              onChange={(e) => setEditEndsAt(e.target.value)}
            />
            <button
              type="button"
              className={btnCls}
              disabled={busy}
              onClick={setEndsAt}
            >
              {auction.endsAt != null ? "تغيير الموعد" : "تحديد موعد"}
            </button>
            {auction.endsAt != null && (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-muted disabled:opacity-50"
                disabled={busy}
                onClick={clearEndsAt}
              >
                إزالة الموعد
              </button>
            )}
          </div>
        </div>
      )}

      {canManage && (
        <div>
          {isOpen ? (
            <button
              type="button"
              className="rounded-lg border border-destructive/40 px-3 py-1.5 text-sm text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
              disabled={busy}
              onClick={closeAuction}
            >
              إغلاق المزايدة
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
              disabled={busy}
              onClick={reopenAuction}
            >
              إعادة فتح المزايدة
            </button>
          )}
        </div>
      )}

      {/* Live bid history — audit of which employee placed each bid. */}
      {bids.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="text-right text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">القيمة</th>
                <th className="px-3 py-2">المزايد</th>
                <th className="px-3 py-2">الجوال</th>
                <th className="px-3 py-2">المصدر</th>
                <th className="px-3 py-2">الموظف</th>
                <th className="px-3 py-2">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bids.map((bid) => (
                <tr key={bid.id}>
                  <td className="px-3 py-2 font-semibold">
                    <SARPrice amount={bid.amount} />
                  </td>
                  <td className="px-3 py-2">{bid.bidderName}</td>
                  <td className="px-3 py-2 text-muted-foreground" dir="ltr">
                    {bid.bidderPhone || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {isValidBidSource(bid.bidderSource)
                      ? BID_SOURCE_LABELS[bid.bidderSource]
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {bid.employeeName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {bid.createdAt ? formatDate(bid.createdAt.toISOString()) : "—"}
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
