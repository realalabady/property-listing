import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { guardAuctionWrite, parsePositiveAmount } from "@/lib/api/auction";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

/**
 * Merge-update only the public-safe auction summary onto the marketplace
 * mirror. The mirror doc exists only while the listing is published, so a
 * missing doc (draft) is a no-op — publishing later rebuilds it in full.
 */
async function syncAuctionMirror(
  companyId: string,
  listingId: string,
  auction: Record<string, unknown> | null,
): Promise<void> {
  const ref = adminDb().doc(`global_listings/${companyId}_${listingId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const summary =
    auction && auction.enabled === true
      ? {
          enabled: true,
          status: auction.status === "closed" ? "closed" : "open",
          startPrice:
            typeof auction.startPrice === "number" ? auction.startPrice : 0,
          currentBid:
            typeof auction.currentBid === "number" ? auction.currentBid : null,
          bidCount: typeof auction.bidCount === "number" ? auction.bidCount : 0,
          endsAt: typeof auction.endsAt === "number" ? auction.endsAt : null,
        }
      : null;
  await ref.set(
    { auction: summary, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

/**
 * Parse an auction end time. Accepts epoch ms (number) or a date string.
 * Returns the ms value, `null` for absent/empty (open-ended / clear), or
 * `"invalid"` for a malformed or past date.
 */
function parseEndsAt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const ms =
    typeof value === "number" ? value : new Date(value as string).getTime();
  if (!Number.isFinite(ms)) return "invalid";
  if (ms <= Date.now()) return "invalid";
  return Math.round(ms);
}

/** POST — enable/start an auction on a for-sale listing. */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const guard = await guardAuctionWrite(companyId, listingId);
    if (!guard.ok) return guard.response;

    const body = (await req.json()) as {
      startPrice?: unknown;
      minIncrement?: unknown;
      endsAt?: unknown;
    };

    const endsAt = parseEndsAt(body.endsAt);
    if (endsAt === "invalid") {
      return NextResponse.json(
        { error: "تاريخ انتهاء المزايدة غير صالح." },
        { status: 400 },
      );
    }

    const startPrice =
      parsePositiveAmount(body.startPrice) ??
      (typeof guard.listingData.price === "number"
        ? guard.listingData.price
        : null);
    if (startPrice === null) {
      return NextResponse.json(
        { error: "سعر بداية المزايدة غير صالح." },
        { status: 400 },
      );
    }
    const minIncrement =
      body.minIncrement === undefined || body.minIncrement === null
        ? 0
        : Math.max(0, Math.round(Number(body.minIncrement) || 0));

    const auction = {
      enabled: true,
      status: "open" as const,
      startPrice,
      minIncrement,
      currentBid: null,
      bidCount: 0,
      highBidId: null,
      highBidByEmployeeId: null,
      highBidByEmployeeName: null,
      endsAt,
      startedByEmployeeId: guard.user.uid,
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      closedAt: null,
    };

    await guard.listingRef.update({
      auction,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await syncAuctionMirror(companyId, listingId, { ...auction, enabled: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /auction]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

/** PATCH — close/reopen an auction or edit its startPrice/minIncrement. */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const guard = await guardAuctionWrite(companyId, listingId);
    if (!guard.ok) return guard.response;

    const existing = guard.listingData.auction as
      | Record<string, unknown>
      | undefined;
    if (!existing || existing.enabled !== true) {
      return NextResponse.json(
        { error: "لا توجد مزايدة على هذا العرض." },
        { status: 400 },
      );
    }

    const body = (await req.json()) as {
      action?: unknown;
      startPrice?: unknown;
      minIncrement?: unknown;
      endsAt?: unknown;
    };

    const update: Record<string, unknown> = {
      "auction.updatedAt": FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.action === "close") {
      update["auction.status"] = "closed";
      update["auction.closedAt"] = FieldValue.serverTimestamp();
    } else if (body.action === "reopen") {
      update["auction.status"] = "open";
      update["auction.closedAt"] = null;
    }

    // Set, change, or clear the auto-close date. Reopening implicitly requires
    // a future end date (or none), so an expired date is rejected above.
    if (body.endsAt !== undefined) {
      const endsAt = parseEndsAt(body.endsAt);
      if (endsAt === "invalid") {
        return NextResponse.json(
          { error: "تاريخ انتهاء المزايدة غير صالح." },
          { status: 400 },
        );
      }
      update["auction.endsAt"] = endsAt;
    }

    if (body.startPrice !== undefined) {
      const startPrice = parsePositiveAmount(body.startPrice);
      if (startPrice === null) {
        return NextResponse.json(
          { error: "سعر بداية المزايدة غير صالح." },
          { status: 400 },
        );
      }
      update["auction.startPrice"] = startPrice;
    }
    if (body.minIncrement !== undefined) {
      update["auction.minIncrement"] = Math.max(
        0,
        Math.round(Number(body.minIncrement) || 0),
      );
    }

    await guard.listingRef.update(update);

    // Re-read to mirror the merged summary accurately.
    const fresh = (await guard.listingRef.get()).get("auction") as
      | Record<string, unknown>
      | undefined;
    await syncAuctionMirror(companyId, listingId, fresh ?? null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /auction]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
