"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

type Locale = "ar" | "en";
type Localized = { ar: string; en: string };
const tr = (v: Localized, l: Locale) => v[l];

interface PropertyRequestModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}

const INTENTS: Array<{ value: string; label: Localized }> = [
  { value: "buy", label: { ar: "شراء", en: "Buy" } },
  { value: "rent", label: { ar: "إيجار", en: "Rent" } },
  { value: "invest", label: { ar: "استثمار", en: "Invest" } },
];

// Buy/invest → a single "max budget" select. Each option maps to min/max SAR.
const SALE_BUDGETS: Array<{ label: Localized; min?: number; max?: number }> = [
  { label: { ar: "غير محدد", en: "Any" } },
  { label: { ar: "حتى 500 ألف", en: "Up to 500K" }, max: 500000 },
  { label: { ar: "حتى 1 مليون", en: "Up to 1M" }, max: 1000000 },
  { label: { ar: "حتى 2 مليون", en: "Up to 2M" }, max: 2000000 },
  { label: { ar: "حتى 3 مليون", en: "Up to 3M" }, max: 3000000 },
  { label: { ar: "حتى 5 مليون", en: "Up to 5M" }, max: 5000000 },
  { label: { ar: "أكثر من 5 مليون", en: "Over 5M" }, min: 5000000 },
];

// Rent → min & max selects of monthly amounts.
const RENT_AMOUNTS = [1000, 2000, 3000, 5000, 8000, 12000, 20000, 30000];

const BEDROOMS = ["", "1", "2", "3", "4", "5"];

const TIMELINES: Array<{ value: string; label: Localized }> = [
  { value: "", label: { ar: "غير محدد", en: "Unspecified" } },
  { value: "immediate", label: { ar: "فوري", en: "Immediate" } },
  { value: "1_3_months", label: { ar: "خلال 1–3 أشهر", en: "1–3 months" } },
  { value: "browsing", label: { ar: "أتصفّح فقط", en: "Just browsing" } },
];

const CONTACT_METHODS: Array<{ value: string; label: Localized }> = [
  { value: "phone", label: { ar: "اتصال", en: "Call" } },
  { value: "whatsapp", label: { ar: "واتساب", en: "WhatsApp" } },
  { value: "email", label: { ar: "بريد إلكتروني", en: "Email" } },
];

export function PropertyRequestModal({
  open,
  onClose,
  locale,
}: PropertyRequestModalProps) {
  const isArabic = locale === "ar";

  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);

  const [intent, setIntent] = useState("buy");
  const [propertyType, setPropertyType] = useState("");
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [saleBudgetIdx, setSaleBudgetIdx] = useState("0");
  const [rentMin, setRentMin] = useState("");
  const [rentMax, setRentMax] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("phone");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadRegions(), loadCities(), loadDistricts()])
      .then(([r, c, d]) => {
        if (!mounted) return;
        setRegions(r);
        setCities(c);
        setDistricts(d);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const cityOptions = useMemo(
    () => cities.filter((c) => String(c.region_id) === regionId),
    [cities, regionId],
  );
  const districtOptions = useMemo(
    () => districts.filter((d) => String(d.city_id) === cityId),
    [districts, cityId],
  );

  const isRent = intent === "rent";

  function buildRequirement() {
    const region = regions.find((r) => String(r.region_id) === regionId);
    const city = cities.find((c) => String(c.city_id) === cityId);
    const district = districts.find(
      (d) => String(d.district_id) === districtId,
    );

    let budgetMin: number | undefined;
    let budgetMax: number | undefined;
    if (isRent) {
      budgetMin = rentMin ? Number(rentMin) : undefined;
      budgetMax = rentMax ? Number(rentMax) : undefined;
    } else {
      const b = SALE_BUDGETS[Number(saleBudgetIdx)];
      budgetMin = b?.min;
      budgetMax = b?.max;
    }

    return {
      intent,
      propertyType: propertyType || undefined,
      region: region?.name_ar || undefined,
      city: city?.name_ar || undefined,
      district: district?.name_ar || undefined,
      budgetMin,
      budgetMax,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      timeline: timeline || undefined,
    };
  }

  async function handleSubmit() {
    if (name.trim().length < 2 || phone.trim().length < 4) {
      setError(
        isArabic
          ? "الرجاء إدخال الاسم ورقم الجوال."
          : "Please enter your name and phone.",
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/lead-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          message,
          preferredContactMethod: contactMethod,
          requirement: buildRequirement(),
          company, // honeypot
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          payload.error ||
            (isArabic ? "تعذّر إرسال الطلب." : "Could not send request."),
        );
      }
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isArabic
            ? "تعذّر إرسال الطلب."
            : "Could not send request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setDone(false);
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isArabic ? "اطلب عقارك" : "Request a property"}
      description={
        done
          ? undefined
          : isArabic
            ? "اخبرنا بما تبحث عنه وسيصل طلبك إلى جميع الشركات العقارية."
            : "Tell us what you need — your request reaches every agency."
      }
      footer={
        done ? (
          <Button onClick={close}>{isArabic ? "تم" : "Done"}</Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} disabled={submitting}>
              {isArabic ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? isArabic
                  ? "جارٍ الإرسال…"
                  : "Sending…"
                : isArabic
                  ? "إرسال الطلب"
                  : "Send request"}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <p className="text-base font-semibold text-foreground">
            {isArabic ? "تم إرسال طلبك بنجاح" : "Your request was sent"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? "وصل طلبك إلى الشركات العقارية، وسيتواصل معك المهتمون قريبًا."
              : "Agencies have received it and interested ones will contact you soon."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Honeypot — visually hidden */}
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field label={isArabic ? "الغرض" : "Purpose"}>
              <Select value={intent} onChange={(e) => setIntent(e.target.value)}>
                {INTENTS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {tr(i.label, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={isArabic ? "نوع العقار" : "Property type"}>
              <Select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="">{isArabic ? "أي نوع" : "Any type"}</option>
                {(Object.values(LISTING_CATEGORIES) as ListingCategory[]).map(
                  (v) => (
                    <option key={v} value={v}>
                      {isArabic
                        ? LISTING_CATEGORY_LABELS[v].ar
                        : LISTING_CATEGORY_LABELS[v].en}
                    </option>
                  ),
                )}
              </Select>
            </Field>

            <Field label={isArabic ? "المنطقة" : "Region"}>
              <Select
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                  setCityId("");
                  setDistrictId("");
                }}
              >
                <option value="">{isArabic ? "غير محدد" : "Any"}</option>
                {regions.map((r) => (
                  <option key={r.region_id} value={String(r.region_id)}>
                    {isArabic ? r.name_ar : r.name_en}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={isArabic ? "المدينة" : "City"}>
              <Select
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setDistrictId("");
                }}
                disabled={!regionId}
              >
                <option value="">{isArabic ? "غير محدد" : "Any"}</option>
                {cityOptions.map((c) => (
                  <option key={c.city_id} value={String(c.city_id)}>
                    {isArabic ? c.name_ar : c.name_en}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={isArabic ? "الحي" : "District"}>
              <Select
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value)}
                disabled={districtOptions.length === 0}
              >
                <option value="">{isArabic ? "غير محدد" : "Any"}</option>
                {districtOptions.map((d) => (
                  <option key={d.district_id} value={String(d.district_id)}>
                    {isArabic ? d.name_ar : d.name_en}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={isArabic ? "عدد الغرف" : "Bedrooms"}>
              <Select
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              >
                {BEDROOMS.map((b) => (
                  <option key={b || "any"} value={b}>
                    {b === "" ? (isArabic ? "أي" : "Any") : b === "5" ? "5+" : b}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Budget — conditional on intent */}
            {isRent ? (
              <>
                <Field label={isArabic ? "الإيجار من (شهري)" : "Rent from (mo)"}>
                  <Select
                    value={rentMin}
                    onChange={(e) => setRentMin(e.target.value)}
                  >
                    <option value="">{isArabic ? "غير محدد" : "Any"}</option>
                    {RENT_AMOUNTS.map((a) => (
                      <option key={a} value={String(a)}>
                        {a.toLocaleString(isArabic ? "ar-SA" : "en-US")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={isArabic ? "الإيجار إلى (شهري)" : "Rent to (mo)"}>
                  <Select
                    value={rentMax}
                    onChange={(e) => setRentMax(e.target.value)}
                  >
                    <option value="">{isArabic ? "غير محدد" : "Any"}</option>
                    {RENT_AMOUNTS.map((a) => (
                      <option key={a} value={String(a)}>
                        {a.toLocaleString(isArabic ? "ar-SA" : "en-US")}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <Field
                label={isArabic ? "الحد الأقصى للميزانية" : "Max budget"}
                className="sm:col-span-1"
              >
                <Select
                  value={saleBudgetIdx}
                  onChange={(e) => setSaleBudgetIdx(e.target.value)}
                >
                  {SALE_BUDGETS.map((b, idx) => (
                    <option key={idx} value={String(idx)}>
                      {tr(b.label, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label={isArabic ? "الجدول الزمني" : "Timeline"}>
              <Select
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              >
                {TIMELINES.map((tln) => (
                  <option key={tln.value || "any"} value={tln.value}>
                    {tr(tln.label, locale)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field label={isArabic ? "الاسم" : "Name"} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isArabic ? "اسمك الكامل" : "Your full name"}
                autoComplete="name"
              />
            </Field>
            <Field label={isArabic ? "رقم الجوال" : "Phone"} required>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Field label={isArabic ? "البريد الإلكتروني" : "Email"}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isArabic ? "اختياري" : "Optional"}
                autoComplete="email"
              />
            </Field>
            <Field label={isArabic ? "طريقة التواصل المفضلة" : "Preferred contact"}>
              <Select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
              >
                {CONTACT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {tr(m.label, locale)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={isArabic ? "ملاحظات إضافية" : "Additional notes"}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={
                isArabic
                  ? "أي تفاصيل أخرى تساعد الشركات على فهم طلبك"
                  : "Any extra details to help agencies understand your need"
              }
              className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}
