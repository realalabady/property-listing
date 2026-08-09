import "server-only";
import nodemailer from "nodemailer";

/**
 * Shared SMTP transport (Resend, per SMTP_HOST/SMTP_USER/SMTP_PASS) used by
 * every transactional email the app sends. Returns null when SMTP is not
 * configured so callers can degrade to "skipped" instead of throwing.
 */

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

export interface MailTransport {
  transporter: nodemailer.Transporter;
  from: string;
  appName: string;
}

export function createTransport(): MailTransport | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? "465");

  if (!host || !user || !pass || !Number.isFinite(port)) {
    return null;
  }

  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return {
    transporter,
    from: process.env.EMAIL_FROM?.trim() || "noreply@listingproperty.app",
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Dar",
  };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
