import Link from "next/link";
import { ROUTES } from "@/constants/routes";

/**
 * Onboarding reminder shown while the signed-in employee still has the
 * generated temporary password (`passwordResetRequired === true`). Disappears
 * only once they set their own password (which clears the flag server-side).
 */
export function PasswordResetBanner() {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          لم تقم بتعيين كلمة مرور خاصة بك بعد
        </p>
        <p className="text-xs text-muted-foreground">
          للحفاظ على أمان حسابك، يرجى تعيين كلمة مرور جديدة من الإعدادات.
        </p>
      </div>
      <Link
        href={ROUTES.DASHBOARD_SETTINGS}
        className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        تعيين كلمة المرور
      </Link>
    </div>
  );
}
