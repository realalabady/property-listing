import { NextResponse, type NextRequest } from "next/server";
import { extractLatLngFromMapUrl } from "@/lib/geo/parse-map-url";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Resolve a Google Maps SHORT link into coordinates.
 *
 * Full Maps URLs carry the lat/lng inline, so the client extracts those
 * directly. Short links (maps.app.goo.gl, goo.gl/maps) don't — they only
 * redirect to the full URL. This endpoint follows that redirect server-side
 * (no browser CORS) and extracts the coordinates from the resolved URL, or
 * from the response body as a fallback.
 *
 * Locked to a small allowlist of Google hosts so it can't be turned into an
 * open redirect/SSRF probe.
 */
const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "maps.google.com",
  "www.google.com",
  "google.com",
]);

export async function POST(req: NextRequest) {
  // Auth-gate: only signed-in users (data entry) hit this, which also keeps the
  // outbound fetcher from being abused anonymously.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "الرابط مطلوب." }, { status: 400 });
  }

  // Fast path: coordinates already present in the pasted link.
  const direct = extractLatLngFromMapUrl(raw);
  if (direct) return NextResponse.json(direct);

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "رابط غير صالح." }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "رابط غير صالح." }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return NextResponse.json(
      { error: "الرجاء لصق رابط خرائط Google." },
      { status: 422 },
    );
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DarBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });

    // Prefer the resolved final URL (it holds the @lat,lng / !3d!4d).
    const fromFinalUrl = extractLatLngFromMapUrl(res.url);
    if (fromFinalUrl) return NextResponse.json(fromFinalUrl);

    // Fallback: scan the HTML body, but only with the strong patterns — the
    // loose "lat,lng" match is unsafe against a full page of numbers.
    const html = await res.text();
    const fromBody = extractLatLngFromMapUrl(html, { allowBareCoords: false });
    if (fromBody) return NextResponse.json(fromBody);

    return NextResponse.json(
      { error: "تعذّر استخراج الموقع من الرابط. جرّب لصق الرابط الكامل." },
      { status: 422 },
    );
  } catch {
    return NextResponse.json(
      { error: "تعذّر فتح الرابط. حاول مرة أخرى." },
      { status: 502 },
    );
  }
}
