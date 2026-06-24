import Link from "next/link";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <h1 className="text-xl font-semibold">{t("errors.title404")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("errors.body404")}
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {t("errors.backHome")}
      </Link>
    </main>
  );
}
