"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { Accordion, AccordionSection } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ROUTES } from "@/constants/routes";
import {
  LISTING_CATEGORIES,
  LISTING_CATEGORY_LABELS,
  type ListingCategory,
} from "@/constants/listing-categories";
import {
  loadCities,
  loadDistricts,
  loadRegions,
  type GeoCity,
  type GeoDistrict,
  type GeoRegion,
} from "@/lib/geo/saudi-geo";
import {
  isValidNationalId,
  isValidSaudiPhone,
  normalizeSaudiPhone,
} from "@/lib/utils/validation";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";

interface NewLeadFormProps {
  companyId: string;
}

interface EmployeeOption {
  id: string;
  name: string;
}
interface ListingOption {
  id: string;
  title: string;
}

interface FormState {
  // Contact
  name: string;
  phone: string;
  email: string;
  nationalId: string;
  preferredContactMethod: string;
  // Classification
  source: string;
  quality: string;
  assignedTo: string;
  // Requirement
  intent: string;
  propertyType: string;
  regionId: string;
  cityId: string;
  districtId: string;
  budgetMin: string;
  budgetMax: string;
  bedrooms: string;
  financing: string;
  timeline: string;
  // Link + notes
  listingId: string;
  message: string;
}

interface Errors {
  name?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialState: FormState = {
  name: "",
  phone: "",
  email: "",
  nationalId: "",
  preferredContactMethod: "phone",
  source: "phone",
  quality: "unrated",
  assignedTo: "",
  intent: "buy",
  propertyType: "",
  regionId: "",
  cityId: "",
  districtId: "",
  budgetMin: "",
  budgetMax: "",
  bedrooms: "",
  financing: "",
  timeline: "",
  listingId: "",
  message: "",
};

const SOURCES: Array<{ value: string; label: string }> = [
  { value: "phone", label: "اتصال هاتفي" },
  { value: "whatsapp", label: "واتساب" },
  { value: "website_form", label: "نموذج الموقع" },
  { value: "walk_in", label: "زيارة المكتب" },
  { value: "social_media", label: "وسائل التواصل" },
  { value: "referral", label: "ترشيح / توصية" },
  { value: "marketplace", label: "سوق العقارات" },
  { value: "other", label: "أخرى" },
];
const QUALITIES: Array<{ value: string; label: string }> = [
  { value: "unrated", label: "غير مصنّف" },
  { value: "qualified", label: "مؤهل" },
  { value: "junk", label: "غير مؤهل (مهمل)" },
];
const CONTACT_METHODS: Array<{ value: string; label: string }> = [
  { value: "phone", label: "اتصال" },
  { value: "whatsapp", label: "واتساب" },
  { value: "email", label: "بريد إلكتروني" },
];
const INTENTS: Array<{ value: string; label: string }> = [
  { value: "buy", label: "شراء" },
  { value: "rent", label: "إيجار" },
  { value: "invest", label: "استثمار" },
  { value: "sell", label: "يريد بيع عقاره" },
];
const FINANCINGS: Array<{ value: string; label: string }> = [
  { value: "", label: "غير محدد" },
  { value: "cash", label: "كاش" },
  { value: "mortgage", label: "تمويل عقاري" },
];
const TIMELINES: Array<{ value: string; label: string }> = [
  { value: "", label: "غير محدد" },
  { value: "immediate", label: "فوري" },
  { value: "1_3_months", label: "خلال 1–3 أشهر" },
  { value: "browsing", label: "يتصفح فقط" },
];

export function NewLeadForm({ companyId }: NewLeadFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let mounted = true;

    // Geo dataset for the requirement location.
    Promise.all([loadRegions(), loadCities(), loadDistricts()])
      .then(([r, c, d]) => {
        if (!mounted) return;
        setRegions(r);
        setCities(c);
        setDistricts(d);
      })
      .catch(() => undefined);

    // Active employees for manual assignment.
    fetch(`/api/companies/${companyId}/employees`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((payload: { employees?: unknown }) => {
        if (!mounted || !Array.isArray(payload.employees)) return;
        setEmployees(
          payload.employees
            .filter(
              (e): e is Record<string, unknown> =>
                typeof e === "object" && e !== null,
            )
            .filter((e) => e.active !== false)
            .map((e) => ({
              id: typeof e.id === "string" ? e.id : "",
              name: typeof e.name === "string" ? e.name : "—",
            }))
            .filter((e) => e.id),
        );
      })
      .catch(() => undefined);

    // Company listings for the property link (client read).
    getDocs(
      query(
        collection(getFirebaseDb(), `companies/${companyId}/listings`),
        orderBy("createdAt", "desc"),
        limit(50),
      ),
    )
      .then((snap) => {
        if (!mounted) return;
        setListings(
          snap.docs.map((d) => ({
            id: d.id,
            title:
              typeof d.data().title === "string"
                ? (d.data().title as string)
                : "عقار بدون عنوان",
          })),
        );
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [companyId]);

  const cityOptions = useMemo(
    () => cities.filter((c) => String(c.region_id) === form.regionId),
    [cities, form.regionId],
  );
  const districtOptions = useMemo(
    () => districts.filter((d) => String(d.city_id) === form.cityId),
    [districts, form.cityId],
  );

  function validate(): Errors {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = t("common.fieldRequired");
    if (!form.phone.trim() || !isValidSaudiPhone(form.phone)) {
      next.phone = !form.phone.trim()
        ? t("common.fieldRequired")
        : t("common.invalidPhone");
    }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      next.email = t("common.invalidEmail");
    }
    if (form.nationalId.trim() && !isValidNationalId(form.nationalId)) {
      next.nationalId = t("common.invalidNationalId");
    }
    return next;
  }

  const requiredStatus = useMemo(() => {
    if (submitted && (errors.name || errors.phone)) return "error" as const;
    if (form.name.trim().length >= 2 && isValidSaudiPhone(form.phone)) {
      return "complete" as const;
    }
    return "neutral" as const;
  }, [submitted, errors.name, errors.phone, form.name, form.phone]);

  function buildRequirement() {
    const region = regions.find((r) => String(r.region_id) === form.regionId);
    const city = cities.find((c) => String(c.city_id) === form.cityId);
    const district = districts.find(
      (d) => String(d.district_id) === form.districtId,
    );
    return {
      intent: form.intent || undefined,
      propertyType: form.propertyType || undefined,
      region: region?.name_ar || undefined,
      city: city?.name_ar || undefined,
      district: district?.name_ar || undefined,
      budgetMin: form.budgetMin.trim() ? Number(form.budgetMin) : undefined,
      budgetMax: form.budgetMax.trim() ? Number(form.budgetMax) : undefined,
      bedrooms: form.bedrooms.trim() ? Number(form.bedrooms) : undefined,
      financing: form.financing || undefined,
      timeline: form.timeline || undefined,
    };
  }

  async function handleSubmit() {
    setSubmitted(true);
    const found = validate();
    setErrors(found);
    if (found.name || found.phone || found.email || found.nationalId) {
      setError(t("common.fixErrors"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const linkedTitle = listings.find((l) => l.id === form.listingId)?.title;
      const response = await fetch(`/api/companies/${companyId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: normalizeSaudiPhone(form.phone),
          email: form.email,
          message: form.message,
          nationalId: form.nationalId.trim() || undefined,
          preferredContactMethod: form.preferredContactMethod || undefined,
          source: form.source,
          quality: form.quality,
          requirement: buildRequirement(),
          listingId: form.listingId || null,
          listingTitle: linkedTitle || "General inquiry",
          assignedTo: form.assignedTo || null,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || t("leadsDash.createFailed"));
      }

      router.push(ROUTES.DASHBOARD_LEADS);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("leadsDash.createFailed"),
      );
      setSubmitting(false);
    }
  }

  const textareaClasses = cn(
    "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground/70 outline-none transition",
    "focus:border-primary focus:ring-4 focus:ring-primary/15",
  );

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Accordion>
        {/* Contact */}
        <AccordionSection
          title={t("leadsDash.leadDetails")}
          description="بيانات التواصل مع العميل"
          status={requiredStatus}
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field
              label={t("common.name")}
              required
              error={submitted ? errors.name : undefined}
            >
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder={t("leadsDash.namePlaceholder")}
                aria-invalid={Boolean(submitted && errors.name)}
              />
            </Field>
            <Field
              label={t("common.phone")}
              required
              error={submitted ? errors.phone : undefined}
            >
              <Input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder={t("leadsDash.phonePlaceholder")}
                inputMode="tel"
                aria-invalid={Boolean(submitted && errors.phone)}
              />
            </Field>
            <Field
              label={t("common.email")}
              error={submitted ? errors.email : undefined}
            >
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder={t("leadsDash.emailPlaceholder")}
                aria-invalid={Boolean(submitted && errors.email)}
              />
            </Field>
            <Field label="طريقة التواصل المفضلة">
              <Select
                value={form.preferredContactMethod}
                onChange={(e) => set("preferredContactMethod")(e.target.value)}
              >
                {CONTACT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t("leadsDash.nationalId")}
              hint={t("leadsDash.nationalIdHint")}
              error={submitted ? errors.nationalId : undefined}
            >
              <Input
                value={form.nationalId}
                onChange={(e) => set("nationalId")(e.target.value)}
                placeholder={t("leadsDash.nationalIdPlaceholder")}
                inputMode="numeric"
                maxLength={10}
                aria-invalid={Boolean(submitted && errors.nationalId)}
              />
            </Field>
          </div>
        </AccordionSection>

        {/* Classification */}
        <AccordionSection
          title="التصنيف والمصدر"
          description="من أين جاء العميل، جودته، ومن المسؤول عنه"
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="مصدر العميل">
              <Select
                value={form.source}
                onChange={(e) => set("source")(e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="جودة العميل" hint="مؤهل أم مهمل (junk)">
              <Select
                value={form.quality}
                onChange={(e) => set("quality")(e.target.value)}
              >
                {QUALITIES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="إسناد إلى موظف"
              hint={
                employees.length === 0
                  ? "لا يوجد موظفون متاحون للإسناد"
                  : undefined
              }
              className="md:col-span-2"
            >
              <Select
                value={form.assignedTo}
                onChange={(e) => set("assignedTo")(e.target.value)}
              >
                <option value="">بدون إسناد</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </AccordionSection>

        {/* Requirement */}
        <AccordionSection
          title="المطلوب (اهتمام العميل)"
          description="ما الذي يبحث عنه العميل — لمطابقته بالعقارات المناسبة"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field label="الغرض">
              <Select
                value={form.intent}
                onChange={(e) => set("intent")(e.target.value)}
              >
                {INTENTS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="نوع العقار">
              <Select
                value={form.propertyType}
                onChange={(e) => set("propertyType")(e.target.value)}
              >
                <option value="">أي نوع</option>
                {(Object.values(LISTING_CATEGORIES) as ListingCategory[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {LISTING_CATEGORY_LABELS[value].ar}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Field label="المنطقة">
              <Select
                value={form.regionId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    regionId: e.target.value,
                    cityId: "",
                    districtId: "",
                  }))
                }
              >
                <option value="">غير محدد</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={String(r.region_id)}>
                    {r.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="المدينة">
              <Select
                value={form.cityId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cityId: e.target.value,
                    districtId: "",
                  }))
                }
                disabled={!form.regionId}
              >
                <option value="">غير محدد</option>
                {cityOptions.map((c) => (
                  <option key={c.city_id} value={String(c.city_id)}>
                    {c.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="الحي">
              <Select
                value={form.districtId}
                onChange={(e) => set("districtId")(e.target.value)}
                disabled={districtOptions.length === 0}
              >
                <option value="">غير محدد</option>
                {districtOptions.map((d) => (
                  <option key={d.district_id} value={String(d.district_id)}>
                    {d.name_ar}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="عدد الغرف (الحد الأدنى)">
              <Input
                value={form.bedrooms}
                onChange={(e) => set("bedrooms")(e.target.value)}
                inputMode="numeric"
                placeholder="مثال: 3"
              />
            </Field>
            <Field label="الميزانية من (ر.س)">
              <Input
                value={form.budgetMin}
                onChange={(e) => set("budgetMin")(e.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
            </Field>
            <Field label="الميزانية إلى (ر.س)">
              <Input
                value={form.budgetMax}
                onChange={(e) => set("budgetMax")(e.target.value)}
                inputMode="numeric"
                placeholder="0"
              />
            </Field>
            <Field label="طريقة التمويل">
              <Select
                value={form.financing}
                onChange={(e) => set("financing")(e.target.value)}
              >
                {FINANCINGS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="الجدول الزمني">
              <Select
                value={form.timeline}
                onChange={(e) => set("timeline")(e.target.value)}
              >
                {TIMELINES.map((tl) => (
                  <option key={tl.value} value={tl.value}>
                    {tl.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </AccordionSection>

        {/* Property link + notes */}
        <AccordionSection
          title="الربط والملاحظات"
          description="اربط العميل بعقار محدد وأضف ملاحظاتك"
        >
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <Field
              label="ربط بعقار"
              hint={
                listings.length === 0 ? "لا توجد عقارات بعد" : undefined
              }
              className="md:col-span-2"
            >
              <Select
                value={form.listingId}
                onChange={(e) => set("listingId")(e.target.value)}
              >
                <option value="">استفسار عام (بدون عقار محدد)</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("leads.message")} className="md:col-span-2">
              <textarea
                value={form.message}
                onChange={(e) => set("message")(e.target.value)}
                placeholder={t("leadsDash.messagePlaceholder")}
                rows={3}
                maxLength={4000}
                className={textareaClasses}
              />
            </Field>
          </div>
        </AccordionSection>
      </Accordion>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => router.push(ROUTES.DASHBOARD_LEADS)}
        >
          {t("common.cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t("common.saving") : t("leadsDash.addLead")}
        </Button>
      </div>
    </div>
  );
}
