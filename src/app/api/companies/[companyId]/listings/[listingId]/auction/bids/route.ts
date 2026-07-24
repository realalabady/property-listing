import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { guardAuctionWrite, parsePositiveAmount } from "@/lib/api/auction";
import { normalizeSaudiPhone } from "@/lib/utils/validation";
import { isValidBidSource } from "@/constants/bid-sources";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ companyId: string; listingId: string }>;
}

/** Merge just the auction summary onto the mirror (see auction/route.ts). */
async function syncAuctionMirror(
  companyId: string,
  listingId: string,
  auction: Record<string, unknown>,
): Promise<void> {
  const ref = adminDb().doc(`global_listings/${companyId}_${listingId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.set(
    {
      auction: {
        enabled: true,
        status: auction.status === "closed" ? "closed" : "open",
        startPrice:
          typeof auction.startPrice === "number" ? auction.startPrice : 0,
        currentBid:
          typeof auction.currentBid === "number" ? auction.currentBid : null,
        bidCount: typeof auction.bidCount === "number" ? auction.bidCount : 0,
        endsAt: typeof auction.endsAt === "number" ? auction.endsAt : null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * POST — place a bid. Runs in a transaction so two bids landing at once can't
 * both "win": the current highest is re-read inside the transaction and the new
 * bid must strictly beat it (plus the min increment).
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { companyId, listingId } = await context.params;
    const guard = await guardAuctionWrite(companyId, listingId);
    if (!guard.ok) return guard.response;

    const body = (await req.json()) as {
      amount?: unknown;
      bidderName?: unknown;
      bidderPhone?: unknown;
      bidderSource?: unknown;
    };
    const amount = parsePositiveAmount(body.amount);
    if (amount === null) {
      return NextResponse.json(
        { error: "قيمة المزايدة غير صالحة." },
        { status: 400 },
      );
    }

    // Strict bidder identity — name and a valid Saudi mobile are required.
    const bidderName =
      typeof body.bidderName === "string" ? body.bidderName.trim() : "";
    if (bidderName.length < 2 || bidderName.length > 80) {
      return NextResponse.json(
        { error: "اسم المزايد مطلوب (حرفان على الأقل)." },
        { status: 400 },
      );
    }
    const bidderPhone =
      typeof body.bidderPhone === "string"
        ? normalizeSaudiPhone(body.bidderPhone)
        : "";
    if (!bidderPhone) {
      return NextResponse.json(
        { error: "رقم جوال المزايد غير صالح." },
        { status: 400 },
      );
    }
    if (!isValidBidSource(body.bidderSource)) {
      return NextResponse.json(
        { error: "حدد كيف وصل المزايد." },
        { status: 400 },
      );
    }
    const bidderSource = body.bidderSource;

    const db = adminDb();
    const listingRef = guard.listingRef;
    const bidRef = listingRef.collection("bids").doc();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      const auction = snap.get("auction") as Record<string, unknown> | undefined;

      if (!auction || auction.enabled !== true) {
        return { error: "لا توجد مزايدة على هذا العرض." };
      }
      if (auction.status !== "open") {
        return { error: "المزايدة مغلقة." };
      }
      if (typeof auction.endsAt === "number" && Date.now() > auction.endsAt) {
        return { error: "انتهت مدة المزايدة." };
      }

      const startPrice =
        typeof auction.startPrice === "number" ? auction.startPrice : 0;
      const currentBid =
        typeof auction.currentBid === "number" ? auction.currentBid : null;
      const minIncrement =
        typeof auction.minIncrement === "number" ? auction.minIncrement : 0;
      const floor = currentBid ?? startPrice;
      const minRequired = currentBid === null ? floor : floor + minIncrement;

      if (amount < minRequired) {
        return {
          error: `يجب أن تكون المزايدة ${minRequired.toLocaleString("en-US")} على الأقل.`,
        };
      }

      tx.create(bidRef, {
        amount,
        placedByEmployeeId: guard.user.uid,
        placedByEmployeeName: guard.actorName,
        bidderName,
        bidderPhone,
        bidderSource,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(listingRef, {
        "auction.currentBid": amount,
        "auction.bidCount": FieldValue.increment(1),
        "auction.highBidId": bidRef.id,
        "auction.highBidByEmployeeId": guard.user.uid,
        "auction.highBidByEmployeeName": guard.actorName,
        "auction.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { ok: true, currentBid: amount };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Refresh the public mirror with the new current bid.
    const fresh = (await listingRef.get()).get("auction") as
      | Record<string, unknown>
      | undefined;
    if (fresh) await syncAuctionMirror(companyId, listingId, fresh);

    return NextResponse.json({ ok: true, currentBid: result.currentBid });
  } catch (err) {
    console.error("[POST /auction/bids]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
