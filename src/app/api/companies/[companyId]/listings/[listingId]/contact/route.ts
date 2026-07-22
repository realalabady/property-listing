import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveAppBaseUrl } from "@/lib/url/app-base-url";
import { normalizeSaudiPhone } from "@/lib/utils/validation";
import { t } from "@/lib/i18n";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

/**
 * "تواصل مع المعلن" redirect. Resolves the listing's current owner
 * server-side — the assigned employee if the listing was reassigned, else the
 * creator — and 302-redirects to that employee's WhatsApp. The employee's
 * phone is intentionally NOT exposed in the public listing payload; it is only
 * surfaced in the redirect at click time. Falls back to the company's WhatsApp,
 * then phone, then the company contact page.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { companyId, listingId } = await context.params;
  const db = adminDb();

  const [listingSnap, companySnap] = await Promise.all([
    db.doc(`companies/${companyId}/listings/${listingId}`).get(),
    db.doc(`companies/${companyId}`).get(),
  ]);

  const listing = listingSnap.exists
    ? (listingSnap.data() as Record<string, unknown>)
    : null;
  const company = (companySnap.data() ?? {}) as Record<string, unknown>;
  const companyContact =
    typeof company.contact === "object" && company.contact !== null
      ? (company.contact as Record<string, unknown>)
      : {};

  // WhatsApp needs an international number (e.g. 9665XXXXXXXX). Normalize Saudi
  // numbers to +966…, then strip to digits. Non-Saudi/unparseable values fall
  // back to their raw digits so already-international numbers still work.
  const toDigits = (value: unknown): string => {
    if (typeof value !== "string" || !value.trim()) return "";
    const intl = normalizeSaudiPhone(value);
    return (intl || value).replace(/[^\d]/g, "");
  };

  // Current owner: assigned employee (follows reassignment) else the creator.
  const targetUid =
    listing && typeof listing.assignedEmployeeId === "string" && listing.assignedEmployeeId
      ? listing.assignedEmployeeId
      : listing && typeof listing.createdBy === "string"
        ? listing.createdBy
        : "";

  let agentDigits = "";
  if (targetUid) {
    const empSnap = await db
      .doc(`companies/${companyId}/employees/${targetUid}`)
      .get();
    agentDigits = toDigits(empSnap.exists ? empSnap.get("phone") : null);
  }

  const companyWaDigits = toDigits(
    companyContact.whatsapp ?? company.whatsapp,
  );
  const companyPhone =
    (typeof companyContact.phone === "string" && companyContact.phone) ||
    (typeof company.phone === "string" && company.phone) ||
    "";

  // Prefill text mirrors the client: listing title + (validated) page URL.
  const title = listing && typeof listing.title === "string" ? listing.title : "";
  const rawUrl = req.nextUrl.searchParams.get("u");
  const pageUrl = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : "";
  const prefill =
    t("marketplace.contactPrefill", { title }) +
    (pageUrl ? `\n${pageUrl}` : "");

  let target: string;
  if (agentDigits) {
    target = `https://wa.me/${agentDigits}?text=${encodeURIComponent(prefill)}`;
  } else if (companyWaDigits) {
    target = `https://wa.me/${companyWaDigits}?text=${encodeURIComponent(prefill)}`;
  } else if (companyPhone) {
    target = `tel:${companyPhone}`;
  } else {
    const slug = typeof company.slug === "string" ? company.slug : "";
    const base = resolveAppBaseUrl(req);
    target = slug ? `${base}/c/${slug}/contact` : base;
  }

  // no-store so the resolved number is never cached by a CDN/proxy.
  return new NextResponse(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store" },
  });
}
