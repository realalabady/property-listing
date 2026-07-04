"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight cookie/privacy consent banner.
 *
 * The app only sets strictly-necessary cookies (the httpOnly session cookie and
 * its idle-activity companion), so this is an informational acknowledgement
 * rather than a tracking opt-in. The choice is stored in localStorage so it is
 * never sent to the server and never affects the session cookies themselves.
 */

const CONSENT_KEY = "cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONSENT_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (private mode) — show once; dismissal is best-effort.
      setVisible(true);
    }
  }, []);

  function decide(choice: "accepted" | "declined") {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Persistence failed — hide anyway so we don't nag within this session.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-live="polite"
      aria-label="إشعار ملفات تعريف الارتباط"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          نستخدم ملفات تعريف الارتباط الضرورية فقط لتشغيل تسجيل الدخول والحفاظ على
          جلستك آمنة. لا نستخدم ملفات تتبّع إعلانية.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
          >
            الضروري فقط
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            موافق
          </button>
        </div>
      </div>
    </div>
  );
}
