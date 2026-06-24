import { type NextRequest } from "next/server";

const LOCAL_HOST_RE =
  /^(?:localhost|0\.0\.0\.0|127(?:\.\d{1,3}){3})(?::\d+)?$/i;

function normalizeConfiguredBaseUrl(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const candidate = value.trim();
  if (!candidate) {
    return "";
  }

  try {
    return new URL(candidate).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function splitFirstHeaderValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const [first = ""] = value.split(",", 1);
  return first.trim();
}

function isPublicHost(hostWithPort: string): boolean {
  if (!hostWithPort) {
    return false;
  }

  return !LOCAL_HOST_RE.test(hostWithPort);
}

function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isPublicHost(parsed.host);
  } catch {
    return false;
  }
}

export function resolveAppBaseUrl(req: NextRequest): string {
  const configuredCandidates = [
    normalizeConfiguredBaseUrl(process.env.APP_BASE_URL),
    normalizeConfiguredBaseUrl(process.env.NEXT_PUBLIC_APP_URL),
  ].filter(Boolean);

  for (const candidate of configuredCandidates) {
    if (isPublicUrl(candidate)) {
      return candidate;
    }
  }

  const forwardedHost = splitFirstHeaderValue(
    req.headers.get("x-forwarded-host"),
  );
  const headerHost = splitFirstHeaderValue(req.headers.get("host"));
  const host = forwardedHost || headerHost;

  const forwardedProto = splitFirstHeaderValue(
    req.headers.get("x-forwarded-proto"),
  );
  const requestProto = req.nextUrl.protocol.replace(/:$/, "");
  const proto = forwardedProto || requestProto || "https";

  if (host && isPublicHost(host)) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const requestOrigin = req.nextUrl.origin.replace(/\/$/, "");
  try {
    const parsed = new URL(requestOrigin);
    if (isPublicHost(parsed.host)) {
      return requestOrigin;
    }
  } catch {
    // Ignore parse errors and fall through to deterministic fallback.
  }

  return "https://property-listing-7f3db.web.app";
}
