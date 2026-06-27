import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Returns true when another document in `collectionPath` already has
 * `field === value` (optionally ignoring `excludeId`, e.g. the doc being
 * edited). Used to enforce "primary"/unique fields like national ID and phone
 * so we keep real, de-duplicated data instead of dummy duplicates.
 */
export async function isFieldValueTaken(
  collectionPath: string,
  field: string,
  value: string,
  excludeId?: string,
): Promise<boolean> {
  if (!value) return false;
  const snap = await adminDb()
    .collection(collectionPath)
    .where(field, "==", value)
    .limit(2)
    .get();
  return snap.docs.some((doc) => doc.id !== excludeId);
}
