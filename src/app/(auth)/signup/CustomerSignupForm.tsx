"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants/routes";

export default function CustomerSignupForm() {
  const router = useRouter();
  const { signUpCustomer } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("phone");
  const [contactConsent, setContactConsent] = useState(true);
  // Honeypot — bots fill it, humans never see it.
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUpCustomer({
        name,
        email,
        phone,
        password,
        preferredContactMethod,
        contactConsent,
        ...(company ? { company } : {}),
      } as Parameters<typeof signUpCustomer>[0]);
      // Customers are not company members — send them to the marketplace.
      router.push(ROUTES.MARKETPLACE);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنشاء الحساب.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring";

  return (
    <main className="dar-light flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-semibold">دار</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            إنشاء حساب عميل
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجّل لتصلك العقارات المطابقة لبحثك من الشركات العقارية.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">الاسم</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="الاسم الكامل"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              رقم الجوال
            </label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="05xxxxxxxx"
              autoComplete="tel"
              inputMode="tel"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              كلمة المرور
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              طريقة التواصل المفضّلة
            </label>
            <select
              value={preferredContactMethod}
              onChange={(e) => setPreferredContactMethod(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="phone">اتصال</option>
              <option value="whatsapp">واتساب</option>
              <option value="email">بريد إلكتروني</option>
            </select>
          </div>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={contactConsent}
              onChange={(e) => setContactConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>أوافق على أن تتواصل معي الشركات العقارية بخصوص العقارات المطابقة لبحثي.</span>
          </label>

          {/* Honeypot */}
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            لديك حساب؟{" "}
            <Link href={ROUTES.LOGIN} className="text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
