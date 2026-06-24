"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getCompanyBySlug, type PublicCompany } from "./data";
import { publicCompanyThemeStyle } from "./theme";
import { t } from "@/lib/i18n";

interface CompanyContactClientProps {
  slug: string;
}

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  message: string;
}

const initialForm: ContactForm = {
  name: "",
  phone: "",
  email: "",
  message: "",
};

export function CompanyContactClient({ slug }: CompanyContactClientProps) {
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<ContactForm>(initialForm);

  useEffect(() => {
    let mounted = true;

    getCompanyBySlug(slug)
      .then((companyData) => {
        if (!mounted) return;
        setCompany(companyData);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("companyPublic.loadContactFailed"),
        );
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company) return;

    if (!form.name.trim() || !form.phone.trim()) {
      setError(t("companyPublic.nameAndPhoneRequired"));
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const db = getFirebaseDb();
      const leadsRef = collection(db, `companies/${company.id}/leads`);
      await addDoc(leadsRef, {
        companyId: company.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        message: form.message.trim() || null,
        source: "website_form",
        listingId: null,
        listingTitle: t("leadsDash.generalInquiry"),
        assignedTo: null,
        assignedToName: null,
        status: "new",
        responseTimeMinutes: null,
        firstResponseAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm(initialForm);
      setSuccess(t("companyPublic.inquirySuccess"));
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("companyPublic.inquiryFailed");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.loadingContact")}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-tight py-12">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="container-tight py-12">
        <p className="text-sm text-muted-foreground">
          {t("companyPublic.companyNotFound")}
        </p>
      </main>
    );
  }

  const whatsappHref = company.whatsapp
    ? `https://wa.me/${company.whatsapp.replace(/[^\d]/g, "")}`
    : null;

  return (
    <main
      className="container-tight py-12"
      style={publicCompanyThemeStyle(company)}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("companyPublic.contactTitle", { company: company.name })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("companyPublic.contactSubtitle")}
          </p>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p>
              {t("companyPublic.phone", {
                value: company.phone || t("companyPublic.notProvided"),
              })}
            </p>
            <p>
              {t("companyPublic.email", {
                value: company.email || t("companyPublic.notProvided"),
              })}
            </p>
            <p>
              {t("companyPublic.whatsapp", {
                value: company.whatsapp || t("companyPublic.notProvided"),
              })}
            </p>
          </div>

          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
            >
              {t("companyPublic.chatWhatsapp")}
            </a>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">
            {t("companyPublic.inquiryForm")}
          </h2>
          <form onSubmit={submitLead} className="mt-4 space-y-3">
            <Field
              label={t("common.name")}
              value={form.name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, name: value }))
              }
              placeholder={t("companyPublic.yourName")}
            />
            <Field
              label={t("common.phone")}
              value={form.phone}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, phone: value }))
              }
              placeholder="+966..."
            />
            <Field
              label={t("common.email")}
              value={form.email}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, email: value }))
              }
              placeholder={t("companyPublic.emailPlaceholder")}
            />

            <label>
              <span className="mb-1.5 block text-sm font-medium">
                {t("leads.message")}
              </span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, message: e.target.value }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                placeholder={t("companyPublic.messagePlaceholder")}
              />
            </label>

            {success && (
              <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? t("companyPublic.submitting") : t("leads.submit")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
    </label>
  );
}
