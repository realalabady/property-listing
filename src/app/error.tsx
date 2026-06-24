"use client";

import Link from "next/link";
import { useEffect } from "react";
import { t } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production you'd forward this to an error monitoring service.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold tracking-tight">500</p>
      <h1 className="text-xl font-semibold">{t("errors.title500")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("errors.body500")}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t("errors.tryAgain")}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          {t("errors.backHome")}
        </Link>
      </div>
    </main>
  );
}
