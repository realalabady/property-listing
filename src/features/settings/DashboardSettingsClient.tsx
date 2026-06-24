"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { t } from "@/lib/i18n";

export type LeadAssignStrategy = "round_robin" | "least_busy" | "manual";

export interface SettingsFormData {
  name: string;
  description: string;
  logo: string;
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    darkMode: boolean;
  };
  leadAutoAssignStrategy: LeadAssignStrategy;
  taskEscalationHours: number;
  notificationEmails: string;
}

interface DashboardSettingsClientProps {
  companyId: string;
  canManageBranding: boolean;
  canManageOperational: boolean;
  initialSettings: SettingsFormData;
}

export function DashboardSettingsClient({
  companyId,
  canManageBranding,
  canManageOperational,
  initialSettings,
}: DashboardSettingsClientProps) {
  const [form, setForm] = useState<SettingsFormData>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload: Record<string, unknown> = {};

      if (canManageBranding) {
        payload.name = form.name;
        payload.description = form.description;
        payload.logo = form.logo;
        payload.contact = {
          phone: form.contact.phone,
          whatsapp: form.contact.whatsapp,
          email: form.contact.email,
        };
        payload.theme = {
          primaryColor: form.theme.primaryColor,
          secondaryColor: form.theme.secondaryColor,
          accentColor: form.theme.accentColor,
          darkMode: form.theme.darkMode,
        };
      }

      if (canManageOperational) {
        payload.leadAutoAssignStrategy = form.leadAutoAssignStrategy;
        payload.taskEscalationHours = Number(form.taskEscalationHours);
        payload.notificationEmails = form.notificationEmails
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }

      const response = await fetch(`/api/companies/${companyId}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || t("settings.saveFailed"));
      }

      setNotice(t("settings.savedSuccess"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogoFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("settings.logoImageOnly"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t("settings.logoTooLarge"));
      return;
    }

    setUploadingLogo(true);
    setError(null);
    setNotice(null);

    try {
      const storage = getFirebaseStorage();
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-");
      const objectPath = `companies/${companyId}/branding/logo-${Date.now()}-${safeName}`;
      const objectRef = ref(storage, objectPath);

      await uploadBytes(objectRef, file, {
        contentType: file.type || undefined,
      });

      const downloadUrl = await getDownloadURL(objectRef);
      setForm((prev) => ({ ...prev, logo: downloadUrl }));
      setNotice(t("settings.logoUploaded"));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("settings.logoUploadFailed"),
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("settings.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </header>

      {(error || notice) && (
        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </div>
          )}
        </div>
      )}

      {canManageBranding && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">
            {t("settings.brandingContact")}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("settings.companyName")}
              value={form.name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, name: value }))
              }
              placeholder={t("settings.companyName")}
            />
            <label>
              <span className="mb-1.5 block text-sm font-medium">
                {t("settings.logoUrl")}
              </span>
              <div className="space-y-2">
                <input
                  value={form.logo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, logo: event.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void uploadLogoFile(event.target.files);
                      event.currentTarget.value = "";
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:py-1.5 file:text-foreground"
                  />
                  {uploadingLogo && (
                    <span className="text-xs text-muted-foreground">
                      {t("settings.uploading")}
                    </span>
                  )}
                </div>
              </div>
            </label>
            <Field
              label={t("settings.contactPhone")}
              value={form.contact.phone}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, phone: value },
                }))
              }
              placeholder="+966..."
            />
            <Field
              label={t("settings.whatsapp")}
              value={form.contact.whatsapp}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, whatsapp: value },
                }))
              }
              placeholder="+966..."
            />
            <Field
              label={t("settings.contactEmail")}
              value={form.contact.email}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, email: value },
                }))
              }
              placeholder={t("settings.contactEmailPlaceholder")}
            />
            {/* Brand colour pickers intentionally hidden — companies use the
                default theme; restore the <ColorField> blocks here to re-enable. */}
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">
              {t("settings.description")}
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
            />
          </label>
        </section>
      )}

      {canManageOperational && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold">
            {t("settings.leadEscalationDefaults")}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label={t("settings.autoAssignStrategy")}
              value={form.leadAutoAssignStrategy}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  leadAutoAssignStrategy: value as LeadAssignStrategy,
                }))
              }
              options={[
                { value: "round_robin", label: t("settings.roundRobin") },
                { value: "least_busy", label: t("settings.leastBusy") },
                { value: "manual", label: t("settings.manual") },
              ]}
            />
            <Field
              label={t("settings.escalationHours")}
              value={String(form.taskEscalationHours)}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  taskEscalationHours: Number(value) || 0,
                }))
              }
              placeholder="24"
            />
            <Field
              label={t("settings.notificationEmails")}
              value={form.notificationEmails}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, notificationEmails: value }))
              }
              placeholder={t("settings.emailsPlaceholder")}
            />
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={saveSettings} disabled={saving}>
          {saving ? t("common.saving") : t("settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function normalizeColorValue(value: string): string {
  const trimmed = value.trim();
  const isHex = /^#[0-9a-fA-F]{6}$/.test(trimmed);
  return isHex ? trimmed : "#000000";
}

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function ColorField({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeColorValue(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
          aria-label={t("settings.colorPicker", { label })}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
        />
      </div>
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
