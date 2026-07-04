"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export interface PersonalInfo {
  name: string;
  email: string;
  roleLabel: string;
  phone: string | null;
  nationalId: string | null;
  department: string | null;
  title: string | null;
  passwordResetRequired: boolean;
}

function firebaseAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "كلمة المرور الحالية غير صحيحة.";
  }
  if (code === "auth/weak-password") {
    return "كلمة المرور الجديدة ضعيفة جدًا (6 أحرف على الأقل).";
  }
  if (code === "auth/too-many-requests") {
    return "محاولات كثيرة، حاول لاحقًا.";
  }
  if (code === "auth/requires-recent-login") {
    return "انتهت صلاحية الجلسة، سجّل الخروج ثم الدخول وحاول مجددًا.";
  }
  return "تعذّر تغيير كلمة المرور، حاول مرة أخرى.";
}

export function PersonalInfoSection({ info }: { info: PersonalInfo }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows: Array<{ label: string; value: string }> = [
    { label: "الاسم", value: info.name },
    { label: "البريد الإلكتروني", value: info.email },
    { label: "الدور", value: info.roleLabel },
    { label: "رقم الجوال", value: info.phone || "—" },
    { label: "رقم الهوية", value: info.nationalId || "—" },
    { label: "القسم", value: info.department || "—" },
    { label: "المسمى الوظيفي", value: info.title || "—" },
  ];

  async function changePassword() {
    setError(null);
    setNotice(null);

    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("no-user");
      }

      // Re-authenticate with the current password before changing it.
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      // Clear the onboarding reminder only after the real change succeeded.
      await fetch("/api/me/password-reset", { method: "POST" });

      setNotice("تم تغيير كلمة المرور بنجاح.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (changeError) {
      setError(
        changeError instanceof Error && changeError.message === "no-user"
          ? "تعذّر تحديد المستخدم الحالي، أعد تسجيل الدخول."
          : firebaseAuthError(changeError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          المعلومات الشخصية
        </h3>
        <p className="text-sm text-muted-foreground">
          بياناتك الخاصة وإدارة كلمة المرور.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="truncate text-sm font-medium text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3 border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground">
          تغيير كلمة المرور
        </h4>
        {info.passwordResetRequired && (
          <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground">
            أنت تستخدم كلمة مرور مؤقتة — يرجى تعيين كلمة مرور جديدة الآن.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PasswordField
            label="كلمة المرور الحالية"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            label="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

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

        <button
          type="button"
          onClick={changePassword}
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}
        </button>
      </div>
    </section>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
