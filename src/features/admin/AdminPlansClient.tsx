"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Landmark,
  Plus,
  Rocket,
  Sprout,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  PLAN_FEATURE_IDS,
  PLAN_FEATURE_LABELS,
  PLAN_ICON_KEYS,
  activeOffer,
  isUnlimited,
} from "@/constants/plans";
import { ROUTES } from "@/constants/routes";
import { planName } from "@/features/plans/plan-labels";
import { cn } from "@/lib/utils/cn";
import type {
  LocalizedText,
  PlanDefinition,
  PlanFeature,
  PlanIconKey,
  PlanOfferType,
} from "@/types/plan";

const formatSar = (value: number) => value.toLocaleString("en-US");

const ICONS: Record<PlanIconKey, LucideIcon> = {
  sprout: Sprout,
  building: Building2,
  landmark: Landmark,
  rocket: Rocket,
  star: Star,
  crown: Crown,
};

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring disabled:opacity-60";

/** Epoch ms → `YYYY-MM-DD` in Riyadh time (matches the API's parsing). */
function toRiyadhDate(ms: number | null): string {
  if (ms === null) return "";
  return new Date(ms + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminPlansClient({
  plans,
  companyCounts,
  pricingVisible,
  nowMs,
}: {
  plans: PlanDefinition[];
  /** Live (non-deleted) companies per plan id. */
  companyCounts: Record<string, number>;
  pricingVisible: boolean;
  nowMs: number;
}) {
  const [creating, setCreating] = useState(false);
  const nextOrder = Math.max(0, ...plans.map((plan) => plan.order)) + 1;

  return (
    <div className="space-y-6">
      <VisibilityCard visible={pricingVisible} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          الباقات ({plans.length})
        </h3>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إضافة باقة
          </button>
        )}
      </div>

      {creating && (
        <PlanEditor
          mode="create"
          plan={blankPlan(nextOrder)}
          companyCount={0}
          nowMs={nowMs}
          onDone={() => setCreating(false)}
        />
      )}

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanEditor
            key={plan.id}
            mode="edit"
            plan={plan}
            companyCount={companyCounts[plan.id] ?? 0}
            nowMs={nowMs}
            isOnlyPlan={plans.length === 1}
          />
        ))}
      </div>
    </div>
  );
}

function blankPlan(order: number): PlanDefinition {
  return {
    id: "",
    order,
    name: { ar: "", en: "" },
    tagline: { ar: "", en: "" },
    priceSar: 0,
    maxListings: 10,
    maxEmployees: 2,
    features: [],
    highlightsIntro: { ar: "", en: "" },
    highlights: [],
    icon: "sprout",
    badge: { ar: "", en: "" },
    offer: null,
  };
}

// ---------------------------------------------------------------------------
// Show / hide the public page
// ---------------------------------------------------------------------------

function VisibilityCard({ visible }: { visible: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pricing/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !visible }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر الحفظ.");
      router.refresh();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "تعذّر الحفظ.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            visible
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {visible ? (
            <Eye className="h-5 w-5" aria-hidden />
          ) : (
            <EyeOff className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div>
          <p className="font-semibold">
            صفحة الباقات {visible ? "ظاهرة للزوار" : "مخفية عن الزوار"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {visible
              ? "رابط «الباقات» ظاهر في الموقع وصفحات الترقية."
              : "الصفحة تعطي «غير موجودة» للزوار وكل روابطها مخفية. يمكنك معاينتها أنت فقط."}
          </p>
          {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.PRICING}
          target="_blank"
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:bg-secondary"
        >
          {visible ? "فتح الصفحة" : "معاينة"}
        </Link>
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label="إظهار صفحة الباقات"
          disabled={saving}
          onClick={toggle}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors disabled:opacity-60",
            visible ? "bg-primary" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
              visible ? "start-6" : "start-1",
            )}
          />
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One plan
// ---------------------------------------------------------------------------

interface Draft {
  order: string;
  name: LocalizedText;
  tagline: LocalizedText;
  price: string;
  listings: string;
  listingsUnlimited: boolean;
  employees: string;
  employeesUnlimited: boolean;
  features: PlanFeature[];
  highlightsIntro: LocalizedText;
  highlights: LocalizedText[];
  icon: PlanIconKey;
  badge: LocalizedText;
  offerEnabled: boolean;
  offerType: PlanOfferType;
  offerPrice: string;
  offerLabelAr: string;
  offerLabelEn: string;
  offerEndsAt: string;
}

function toDraft(plan: PlanDefinition): Draft {
  return {
    order: String(plan.order),
    name: plan.name,
    tagline: plan.tagline,
    price: plan.priceSar ? String(plan.priceSar) : "",
    listings: isUnlimited(plan.maxListings) ? "" : String(plan.maxListings),
    listingsUnlimited: isUnlimited(plan.maxListings),
    employees: isUnlimited(plan.maxEmployees) ? "" : String(plan.maxEmployees),
    employeesUnlimited: isUnlimited(plan.maxEmployees),
    features: plan.features,
    highlightsIntro: plan.highlightsIntro,
    highlights: plan.highlights,
    icon: plan.icon,
    badge: plan.badge,
    offerEnabled: plan.offer?.enabled ?? false,
    offerType: plan.offer?.type ?? "discount",
    offerPrice: plan.offer?.priceSar ? String(plan.offer.priceSar) : "",
    offerLabelAr: plan.offer?.labelAr ?? "",
    offerLabelEn: plan.offer?.labelEn ?? "",
    offerEndsAt: toRiyadhDate(plan.offer?.endsAtMs ?? null),
  };
}

function toPayload(draft: Draft) {
  return {
    order: Number(draft.order),
    name: draft.name,
    tagline: draft.tagline,
    priceSar: Number(draft.price),
    maxListings: draft.listingsUnlimited ? -1 : Number(draft.listings),
    maxEmployees: draft.employeesUnlimited ? -1 : Number(draft.employees),
    features: draft.features,
    highlightsIntro: draft.highlightsIntro,
    highlights: draft.highlights,
    icon: draft.icon,
    badge: draft.badge,
    offer: {
      enabled: draft.offerEnabled,
      type: draft.offerType,
      priceSar:
        draft.offerType === "discount" ? Number(draft.offerPrice) : null,
      labelAr: draft.offerLabelAr,
      labelEn: draft.offerLabelEn,
      endsAt: draft.offerEndsAt || null,
    },
  };
}

function offerStatus(plan: PlanDefinition, nowMs: number) {
  const offer = plan.offer;
  if (!offer?.enabled) return null;
  if (offer.endsAtMs !== null && offer.endsAtMs <= nowMs) {
    return { label: "العرض منتهي", tone: "warn" as const };
  }
  return activeOffer(plan, nowMs)
    ? { label: "عرض فعّال", tone: "ok" as const }
    : { label: "العرض غير مكتمل", tone: "warn" as const };
}

function limitText(limit: number, noun: string) {
  return isUnlimited(limit) ? `${noun} غير محدود` : `${limit} ${noun}`;
}

function PlanEditor({
  mode,
  plan,
  companyCount,
  nowMs,
  isOnlyPlan = false,
  onDone,
}: {
  mode: "create" | "edit";
  plan: PlanDefinition;
  companyCount: number;
  nowMs: number;
  isOnlyPlan?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(mode === "create");
  const [draft, setDraft] = useState<Draft>(() => toDraft(plan));
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const setText = (
    key: "name" | "tagline" | "highlightsIntro" | "badge",
    lang: "ar" | "en",
    value: string,
  ) => setDraft((prev) => ({ ...prev, [key]: { ...prev[key], [lang]: value } }));

  const status = mode === "edit" ? offerStatus(plan, nowMs) : null;
  const Icon = ICONS[draft.icon];

  const save = async () => {
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/plans" : `/api/admin/plans/${plan.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(draft)),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر الحفظ.");
      if (mode === "create") {
        onDone?.();
      } else {
        setNotice("تم الحفظ — التغييرات مطبّقة الآن.");
      }
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذّر الحفظ.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm(`حذف باقة «${planName(plan)}» نهائيًا؟`)) return;
    setBusy("delete");
    setError(null);
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "تعذّر الحذف.");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "تعذّر الحذف.",
      );
      setBusy(null);
    }
  };

  const deleteBlocked = companyCount > 0 || isOnlyPlan;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-start transition-colors hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold">
                {mode === "create" ? "باقة جديدة" : planName(plan)}
              </span>
              {mode === "edit" && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {plan.id}
                </span>
              )}
              {status && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    status.tone === "ok"
                      ? "bg-success/10 text-success"
                      : "bg-amber-500/10 text-amber-600",
                  )}
                >
                  {status.label}
                </span>
              )}
            </span>
            {mode === "edit" && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {formatSar(plan.priceSar)} ر.س/سنة ·{" "}
                {limitText(plan.maxListings, "عقار")} ·{" "}
                {limitText(plan.maxEmployees, "موظف")} · {companyCount} شركة
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border p-5">
          {mode === "edit" && companyCount > 0 && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              {companyCount} شركة على هذه الباقة — تغيير الحدود أو المزايا يُطبَّق
              عليها فورًا.
            </p>
          )}

          <Group title="المعلومات الأساسية">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم الباقة (عربي) *">
                <input
                  value={draft.name.ar}
                  maxLength={40}
                  onChange={(e) => setText("name", "ar", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="اسم الباقة (إنجليزي)"
                hint={
                  mode === "create"
                    ? "يُستخدم أيضًا لإنشاء معرّف الباقة."
                    : undefined
                }
              >
                <input
                  dir="ltr"
                  value={draft.name.en}
                  maxLength={40}
                  onChange={(e) => setText("name", "en", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="وصف مختصر (عربي)">
                <input
                  value={draft.tagline.ar}
                  maxLength={100}
                  onChange={(e) => setText("tagline", "ar", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="وصف مختصر (إنجليزي)">
                <input
                  dir="ltr"
                  value={draft.tagline.en}
                  maxLength={100}
                  onChange={(e) => setText("tagline", "en", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field
                label="شارة مميزة (عربي)"
                hint="اكتب نصًا مثل «الأكثر طلبًا» لتمييز البطاقة، أو اتركه فارغًا."
              >
                <input
                  value={draft.badge.ar}
                  maxLength={30}
                  onChange={(e) => setText("badge", "ar", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="شارة مميزة (إنجليزي)">
                <input
                  dir="ltr"
                  value={draft.badge.en}
                  maxLength={30}
                  onChange={(e) => setText("badge", "en", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="الأيقونة">
                <div className="flex flex-wrap gap-2">
                  {PLAN_ICON_KEYS.map((key) => {
                    const Choice = ICONS[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("icon", key)}
                        aria-label={key}
                        aria-pressed={draft.icon === key}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border transition",
                          draft.icon === key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        <Choice className="h-5 w-5" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field
                label="الترتيب"
                hint="الأصغر يظهر أولًا ويُعد الباقة الأدنى."
              >
                <input
                  type="number"
                  value={draft.order}
                  onChange={(e) => set("order", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Group>

          <Group title="السعر والحدود">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="السعر السنوي (ر.س، قبل الضريبة) *">
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={draft.price}
                  onChange={(e) => set("price", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <LimitField
                label="عدد العقارات"
                value={draft.listings}
                unlimited={draft.listingsUnlimited}
                min={0}
                onValue={(v) => set("listings", v)}
                onUnlimited={(v) => set("listingsUnlimited", v)}
              />
              <LimitField
                label="عدد الموظفين"
                value={draft.employees}
                unlimited={draft.employeesUnlimited}
                min={1}
                onValue={(v) => set("employees", v)}
                onUnlimited={(v) => set("employeesUnlimited", v)}
              />
            </div>
          </Group>

          <Group
            title="المزايا المتاحة"
            hint="الميزات غير المحددة تظهر مقفلة لشركات هذه الباقة. باقي المزايا متاحة لكل الباقات."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {PLAN_FEATURE_IDS.map((feature) => {
                const checked = draft.features.includes(feature);
                return (
                  <label
                    key={feature}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
                      checked ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        set(
                          "features",
                          e.target.checked
                            ? PLAN_FEATURE_IDS.filter(
                                (f) => f === feature || draft.features.includes(f),
                              )
                            : draft.features.filter((f) => f !== feature),
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {PLAN_FEATURE_LABELS[feature].ar}
                  </label>
                );
              })}
            </div>
          </Group>

          <Group
            title="نقاط بطاقة الأسعار"
            hint="عدد العقارات والموظفين يُضاف تلقائيًا في أول القائمة."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="سطر تمهيدي (عربي)">
                <input
                  value={draft.highlightsIntro.ar}
                  maxLength={80}
                  placeholder="مثال: كل مزايا مبتدئ، بالإضافة إلى:"
                  onChange={(e) =>
                    setText("highlightsIntro", "ar", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="سطر تمهيدي (إنجليزي)">
                <input
                  dir="ltr"
                  value={draft.highlightsIntro.en}
                  maxLength={80}
                  onChange={(e) =>
                    setText("highlightsIntro", "en", e.target.value)
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-4 space-y-2">
              {draft.highlights.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    value={item.ar}
                    maxLength={120}
                    placeholder="النقطة بالعربي"
                    onChange={(e) =>
                      set(
                        "highlights",
                        draft.highlights.map((h, i) =>
                          i === index ? { ...h, ar: e.target.value } : h,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                  <input
                    dir="ltr"
                    value={item.en}
                    maxLength={120}
                    placeholder="English (optional)"
                    onChange={(e) =>
                      set(
                        "highlights",
                        draft.highlights.map((h, i) =>
                          i === index ? { ...h, en: e.target.value } : h,
                        ),
                      )
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label="حذف النقطة"
                    onClick={() =>
                      set(
                        "highlights",
                        draft.highlights.filter((_, i) => i !== index),
                      )
                    }
                    className="shrink-0 rounded-md border border-border p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              {draft.highlights.length < 12 && (
                <button
                  type="button"
                  onClick={() =>
                    set("highlights", [...draft.highlights, { ar: "", en: "" }])
                  }
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  إضافة نقطة
                </button>
              )}
            </div>
          </Group>

          <OfferFields draft={draft} set={set} />

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy !== null}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {busy === "save"
                  ? "جارٍ الحفظ..."
                  : mode === "create"
                    ? "إنشاء الباقة"
                    : "حفظ التغييرات"}
              </button>
              {mode === "create" && (
                <button
                  type="button"
                  onClick={onDone}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
                >
                  إلغاء
                </button>
              )}
            </div>
            {mode === "edit" && (
              <div className="flex items-center gap-3">
                {deleteBlocked && (
                  <span className="text-xs text-muted-foreground">
                    {isOnlyPlan
                      ? "لا يمكن حذف آخر باقة."
                      : "انقل الشركات لباقة أخرى قبل الحذف."}
                  </span>
                )}
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy !== null || deleteBlocked}
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {busy === "delete" ? "جارٍ الحذف..." : "حذف الباقة"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="text-sm font-bold">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function LimitField({
  label,
  value,
  unlimited,
  min,
  onValue,
  onUnlimited,
}: {
  label: string;
  value: string;
  unlimited: boolean;
  min: number;
  onValue: (value: string) => void;
  onUnlimited: (value: boolean) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min}
        inputMode="numeric"
        value={unlimited ? "" : value}
        disabled={unlimited}
        placeholder={unlimited ? "غير محدود" : undefined}
        onChange={(e) => onValue(e.target.value)}
        className={inputClass}
      />
      <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(e) => onUnlimited(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        غير محدود
      </label>
    </div>
  );
}

function OfferFields({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const price = Number(draft.price) || 0;
  const offerPrice = Number(draft.offerPrice) || 0;
  const showDiscount =
    draft.offerEnabled &&
    draft.offerType === "discount" &&
    offerPrice > 0 &&
    offerPrice < price;

  return (
    <Group title="العرض">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={draft.offerEnabled}
          onChange={(e) => set("offerEnabled", e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        تفعيل عرض على هذه الباقة
      </label>

      <fieldset
        disabled={!draft.offerEnabled}
        className="mt-4 grid gap-4 disabled:opacity-60 md:grid-cols-2"
      >
        <div className="md:col-span-2 grid max-w-sm grid-cols-2 gap-2">
          {(
            [
              ["discount", "سعر مخفّض"],
              ["text", "نص فقط"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("offerType", value)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition",
                draft.offerType === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {draft.offerType === "discount" && (
          <Field label="سعر العرض (ر.س)">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.offerPrice}
              onChange={(e) => set("offerPrice", e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
        <Field
          label="ينتهي العرض في (اختياري)"
          hint="يختفي تلقائيًا بعد نهاية هذا اليوم."
        >
          <input
            type="date"
            value={draft.offerEndsAt}
            onChange={(e) => set("offerEndsAt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="نص العرض (عربي)">
          <input
            value={draft.offerLabelAr}
            maxLength={80}
            placeholder="مثال: عرض اليوم الوطني"
            onChange={(e) => set("offerLabelAr", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="نص العرض (إنجليزي، اختياري)">
          <input
            dir="ltr"
            value={draft.offerLabelEn}
            maxLength={80}
            onChange={(e) => set("offerLabelEn", e.target.value)}
            className={inputClass}
          />
        </Field>
      </fieldset>

      {draft.offerEnabled && (
        <div className="mt-4 max-w-sm rounded-lg border border-dashed border-border bg-background p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            معاينة السعر
          </p>
          {showDiscount && (
            <p className="text-sm text-muted-foreground line-through">
              {formatSar(price)} ر.س
            </p>
          )}
          <p className="text-2xl font-extrabold tracking-tight">
            {formatSar(showDiscount ? offerPrice : price)}{" "}
            <span className="text-sm font-semibold">ر.س</span>{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / سنويًا
            </span>
          </p>
          {draft.offerLabelAr.trim() && (
            <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {draft.offerLabelAr}
            </span>
          )}
        </div>
      )}
    </Group>
  );
}
