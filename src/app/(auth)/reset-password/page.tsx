import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("auth.setNewPasswordTitle"),
  // A reset link must never be indexed or forwarded to an analytics referrer.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
