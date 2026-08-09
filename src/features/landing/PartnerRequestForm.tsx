"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CheckCircle2, Globe, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";

type Locale = "ar" | "en";
type Localized = { ar: string; en: string };
const tr = (v: Localized, l: Locale) => v[l];

const BENEFITS: Localized[] = [
  {
    ar: "صفحة خاصة بشركتك وعرض عقاراتك أمام آلاف الباحثين",
    en: "Your own branded page, listings in front of thousands of searchers",
  },
  {
    ar: "طلبات العملاء تصلك مباشرة مع لوحة متابعة كاملة",
    en: "Customer requests reach you directly, with a full pipeline board",
  },
  {
    ar: "إدارة الموظفين والصلاحيات والمهام من مكان واحد",
    en: "Employees, permissions and tasks managed from one place",
  },
];

export function PartnerRequestForm() {
  const [locale, setLocale] = useState<Locale>("ar");
  const isArabic = locale === "ar";

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [cr, setCr] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partner-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          commercialRegistrationNumber: cr,
          email,
          phone,
          city,
          message,
          website, // honeypot
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

  return (
    <div
      lang={locale}
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        fontFamily: isArabic ? "var(--font-arabic)" : "var(--font-sans)",
      }}
      className="dar-light min-h-screen bg-background text-foreground"
    >
      <header className="border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container-tight flex h-16 items-center justify-between gap-4">
          <Link href={ROUTES.HOME} className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              {isArabic ? "دار" : "Dar"}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale((p) => (p === "ar" ? "en" : "ar"))}
              className="gap-1.5"
            >
              <Globe className="h-4 w-4" />
              {isArabic ? "EN" : "AR"}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.HOME}>
                {isArabic ? "العودة للرئيسية" : "Back home"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-tight grid gap-10 py-12 md:grid-cols-[1fr_1.15fr] md:py-16">
        <section className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {isArabic ? "انضم كشريك" : "Become a partner"}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {isArabic
              ? "انضم إلى دار كشركة عقارية"
              : "Join Dar as a real-estate agency"}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {isArabic
              ? "أرسل بيانات شركتك وسنراجع الطلب ونتواصل معك لإنشاء حساب شركتك على المنصة."
              : "Send us your company details. We review the application and contact you to set up your company account."}
          </p>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b.en} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{tr(b, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <p className="text-lg font-semibold text-foreground">
                {isArabic ? "تم استلام طلبك" : "Application received"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {isArabic
                  ? "سيراجع فريقنا بيانات شركتك ويتواصل معك على بريدك الإلكتروني لإتمام إنشاء الحساب."
                  : "Our team will review your details and email you to finish setting up the account."}
              </p>
              <Button asChild className="mt-2">
                <Link href={ROUTES.HOME}>
                  {isArabic ? "العودة للرئيسية" : "Back home"}
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {isArabic ? "بيانات الشركة" : "Company details"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isArabic
                    ? "الحقول المعلّمة بـ * مطلوبة."
                    : "Fields marked * are required."}
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Honeypot — visually hidden */}
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
              />

              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field
                  label={isArabic ? "اسم الشركة" : "Company name"}
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={
                      isArabic ? "شركة دار للعقارات" : "Dar Real Estate Co."
                    }
                    required
                    autoComplete="organization"
                  />
                </Field>

                <Field
                  label={isArabic ? "اسم مسؤول التواصل" : "Contact name"}
                  required
                >
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={isArabic ? "اسمك الكامل" : "Your full name"}
                    required
                    autoComplete="name"
                  />
                </Field>

                <Field
                  label={
                    isArabic ? "رقم السجل التجاري" : "Commercial registration"
                  }
                  required
                  hint={
                    isArabic
                      ? "10 أرقام تبدأ بالرقم 7"
                      : "10 digits starting with 7"
                  }
                >
                  <Input
                    value={cr}
                    onChange={(e) => setCr(e.target.value)}
                    placeholder="70xxxxxxxx"
                    inputMode="numeric"
                    required
                  />
                </Field>

                <Field
                  label={isArabic ? "البريد الإلكتروني" : "Email"}
                  required
                  hint={
                    isArabic
                      ? "سنرسل بيانات الحساب عليه"
                      : "We send the account details here"
                  }
                >
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@company.com"
                    required
                    autoComplete="email"
                  />
                </Field>

                <Field label={isArabic ? "رقم الجوال" : "Phone"} required>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </Field>

                <Field
                  label={isArabic ? "المدينة" : "City"}
                  className="sm:col-span-2"
                >
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={isArabic ? "الرياض" : "Riyadh"}
                  />
                </Field>
              </div>

              <Field label={isArabic ? "نبذة عن الشركة" : "About the company"}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={
                    isArabic
                      ? "عدد العقارات، مجال التخصص، أو أي تفاصيل تساعدنا"
                      : "Portfolio size, specialty, or anything else that helps"
                  }
                  className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full"
              >
                {submitting
                  ? isArabic
                    ? "جارٍ الإرسال…"
                    : "Sending…"
                  : isArabic
                    ? "إرسال الطلب"
                    : "Send application"}
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
