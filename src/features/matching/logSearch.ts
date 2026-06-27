import type { ListingFilters } from "@/features/public/filters";

/**
 * Fire-and-forget: record a committed marketplace search for the signed-in
 * customer. The API no-ops for anonymous/company users and for empty criteria,
 * so callers can invoke it unconditionally on any committed search.
 */
export function logCustomerSearch(filters: ListingFilters): void {
  void fetch("/api/customer/searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ criteria: filters }),
  }).catch(() => {
    // Never let lead logging interfere with the user's search.
  });
}
