"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  // Opt-in: unchecked by default (affirmative consent, not pre-ticked).
  const [contactConsent, setContactConsent] = useState(false);
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

  return (
    <AuthShell
      title="إنشاء حساب عميل"
      subtitle="سجّل لتصلك العقارات المطابقة لبحثك من الشركات العقارية."
      aside={{
        heading: "ابحث عن عقارك التالي بثقة",
        points: [
          "احفظ عمليات البحث وتابع العقارات التي تهمك.",
          "تواصل مباشرة مع شركات عقارية موثوقة.",
          "تصلك العقارات الجديدة المطابقة لبحثك أولاً.",
        ],
      }}
      footer={
        <>
          لديك حساب؟{" "}
          <Link
            href={ROUTES.LOGIN}
            className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-[hsl(274_60%_30%)] hover:decoration-primary"
          >
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="الاسم" htmlFor="signup-name" required>
          <Input
            id="signup-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            autoComplete="name"
          />
        </Field>

        <Field label="البريد الإلكتروني" htmlFor="signup-email" required>
          <Input
            id="signup-email"
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="رقم الجوال" htmlFor="signup-phone" required>
          <Input
            id="signup-phone"
            required
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xxxxxxxx"
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>

        <Field
          label="كلمة المرور"
          htmlFor="signup-password"
          required
          hint="8 أحرف على الأقل"
        >
          <Input
            id="signup-password"
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <Field label="طريقة التواصل المفضّلة" htmlFor="signup-contact">
          <Select
            id="signup-contact"
            value={preferredContactMethod}
            onChange={(e) => setPreferredContactMethod(e.target.value)}
          >
            <option value="phone">اتصال</option>
            <option value="whatsapp">واتساب</option>
            <option value="email">بريد إلكتروني</option>
          </Select>
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={contactConsent}
            onChange={(e) => setContactConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="leading-relaxed">
            أوافق على أن تتواصل معي الشركات العقارية بخصوص العقارات المطابقة
            لبحثي.
          </span>
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
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <Button type="submit" variant="brand" disabled={loading} size="lg" className="w-full">
          {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
          {loading ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
        </Button>
      </form>
    </AuthShell>
  );
}
