"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLAN_IDS,
  activeOffer,
  isUnlimited,
  limitsForPlan,
} from "@/constants/plans";
import { PLAN_LABEL_KEYS } from "@/features/plans/plan-labels";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import type { SubscriptionPlanId } from "@/types/company";
import type {
  PlanCatalog,
  PlanOfferType,
  PlanPricingConfig,
} from "@/types/plan";

const formatSar = (value: number) => value.toLocaleString("en-US");

/** Epoch ms → `YYYY-MM-DD` in Riyadh time (matches the API's parsing). */
function toRiyadhDate(ms: number | null): string {
  if (ms === null) return "";
  return new Date(ms + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring disabled:opacity-60";

export function AdminPlansClient({
  catalog,
  nowMs,
}: {
  catalog: PlanCatalog;
  nowMs: number;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {PLAN_IDS.map((plan) => (
        <PlanEditor
          key={plan}
          plan={plan}
          config={catalog[plan]}
          nowMs={nowMs}
        />
      ))}
    </div>
  );
}

function offerStatus(config: PlanPricingConfig, nowMs: number) {
  const offer = config.offer;
  if (!offer?.enabled) return { label: "لا يوجد عرض", tone: "muted" as const };
  if (offer.endsAtMs !== null && offer.endsAtMs <= nowMs) {
    return { label: "العرض منتهي", tone: "warn" as const };
  }
  return activeOffer(config, nowMs)
    ? { label: "العرض ظاهر الآن", tone: "ok" as const }
    : { label: "العرض غير مكتمل", tone: "warn" as const };
}

function PlanEditor({
  plan,
  config,
  nowMs,
}: {
  plan: SubscriptionPlanId;
  config: PlanPricingConfig;
  nowMs: number;
}) {
  const router = useRouter();
  const offer = config.offer;

  const [price, setPrice] = useState(String(config.priceSar));
  const [offerEnabled, setOfferEnabled] = useState(offer?.enabled ?? false);
  const [offerType, setOfferType] = useState<PlanOfferType>(
    offer?.type ?? "discount",
  );
  const [offerPrice, setOfferPrice] = useState(
    offer?.priceSar ? String(offer.priceSar) : "",
  );
  const [labelAr, setLabelAr] = useState(offer?.labelAr ?? "");
  const [labelEn, setLabelEn] = useState(offer?.labelEn ?? "");
  const [endsAt, setEndsAt] = useState(toRiyadhDate(offer?.endsAtMs ?? null));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { maxListings, maxEmployees } = limitsForPlan(plan);
  const status = offerStatus(config, nowMs);

  // Live preview of the public card, from the unsaved form values.
  const previewPrice = Number(price) || 0;
  const previewOfferPrice = Number(offerPrice) || 0;
  const showDiscount =
    offerEnabled &&
    offerType === "discount" &&
    previewOfferPrice > 0 &&
    previewOfferPrice < previewPrice;
  const showLabel = offerEnabled && labelAr.trim().length > 0;

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/plans/${plan}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceSar: Number(price),
          offer: {
            enabled: offerEnabled,
            type: offerType,
            priceSar: offerType === "discount" ? Number(offerPrice) : null,
            labelAr,
            labelEn,
            endsAt: endsAt || null,
          },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر الحفظ.");
      setNotice("تم الحفظ — التغيير ظاهر الآن في صفحة الباقات.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذّر الحفظ.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{t(PLAN_LABEL_KEYS[plan])}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isUnlimited(maxListings) ? "عقارات غير محدودة" : `${maxListings} عقار`}
            {" · "}
            {isUnlimited(maxEmployees)
              ? "موظفون غير محدودين"
              : `${maxEmployees} موظف`}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            status.tone === "ok" && "bg-success/10 text-success",
            status.tone === "warn" && "bg-amber-500/10 text-amber-600",
            status.tone === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          {status.label}
        </span>
      </header>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium">
          السعر السنوي (ر.س، قبل الضريبة)
        </span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={inputClass}
        />
      </label>

      <div className="my-5 border-t border-border" />

      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">عرض على الباقة</span>
        <input
          type="checkbox"
          checked={offerEnabled}
          onChange={(event) => setOfferEnabled(event.target.checked)}
          className="h-4 w-4 accent-primary"
        />
      </label>

      <fieldset
        disabled={!offerEnabled}
        className="mt-4 space-y-4 disabled:opacity-60"
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["discount", "سعر مخفّض"],
              ["text", "نص فقط"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setOfferType(value)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition",
                offerType === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {offerType === "discount" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              سعر العرض (ر.س)
            </span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={offerPrice}
              onChange={(event) => setOfferPrice(event.target.value)}
              className={inputClass}
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">نص العرض</span>
          <input
            value={labelAr}
            maxLength={80}
            onChange={(event) => setLabelAr(event.target.value)}
            placeholder="مثال: عرض اليوم الوطني"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            نص العرض بالإنجليزية (اختياري)
          </span>
          <input
            dir="ltr"
            value={labelEn}
            maxLength={80}
            onChange={(event) => setLabelEn(event.target.value)}
            placeholder="e.g. National Day offer"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            ينتهي العرض في (اختياري)
          </span>
          <input
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            يختفي العرض تلقائيًا بعد نهاية هذا اليوم. اتركه فارغًا ليبقى حتى
            تُوقفه.
          </span>
        </label>
      </fieldset>

      {/* Preview */}
      <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          معاينة السعر في صفحة الباقات
        </p>
        {showDiscount && (
          <p className="text-sm text-muted-foreground line-through">
            {formatSar(previewPrice)} ر.س
          </p>
        )}
        <p className="text-2xl font-extrabold tracking-tight">
          {formatSar(showDiscount ? previewOfferPrice : previewPrice)}{" "}
          <span className="text-sm font-semibold">ر.س</span>{" "}
          <span className="text-xs font-normal text-muted-foreground">
            / سنويًا
          </span>
        </p>
        {showLabel && (
          <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {labelAr}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ"}
      </button>
    </section>
  );
}
