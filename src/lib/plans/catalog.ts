import "server-only";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { PLAN_IDS, PLAN_PRICES_SAR } from "@/constants/plans";
import type { SubscriptionPlanId } from "@/types/company";
import type {
  PlanCatalog,
  PlanOfferConfig,
  PlanPricingConfig,
} from "@/types/plan";

function toMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    const fn = (value as { toMillis?: unknown }).toMillis;
    if (typeof fn === "function") return fn.call(value) as number;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseOffer(raw: unknown): PlanOfferConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const price = data.priceSar;
  return {
    enabled: data.enabled === true,
    type: data.type === "text" ? "text" : "discount",
    priceSar: typeof price === "number" && price > 0 ? price : null,
    labelAr: str(data.labelAr),
    labelEn: str(data.labelEn),
    endsAtMs: toMillis(data.endsAt),
  };
}

function parsePlanDoc(
  plan: SubscriptionPlanId,
  data: Record<string, unknown> | undefined,
): PlanPricingConfig {
  const price = data?.priceSar;
  return {
    priceSar:
      typeof price === "number" && price > 0 ? price : PLAN_PRICES_SAR[plan],
    offer: parseOffer(data?.offer),
  };
}

/**
 * Admin-editable pricing for every plan (`plans/{planId}`), falling back to
 * the code defaults for plans without a doc. One batched read per request.
 */
export const getPlanCatalog = cache(async (): Promise<PlanCatalog> => {
  const db = adminDb();
  const snaps = await db.getAll(
    ...PLAN_IDS.map((plan) => db.doc(`plans/${plan}`)),
  );
  const catalog = {} as PlanCatalog;
  PLAN_IDS.forEach((plan, i) => {
    const snap = snaps[i];
    catalog[plan] = parsePlanDoc(
      plan,
      snap?.exists ? (snap.data() as Record<string, unknown>) : undefined,
    );
  });
  return catalog;
});

/** Current yearly base price per plan (ignores offers). */
export async function getPlanPrices(): Promise<
  Record<SubscriptionPlanId, number>
> {
  const catalog = await getPlanCatalog();
  const prices = {} as Record<SubscriptionPlanId, number>;
  for (const plan of PLAN_IDS) prices[plan] = catalog[plan].priceSar;
  return prices;
}
