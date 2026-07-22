import { DarPublicShell } from "@/features/public/DarPublicShell";
import { ListingDetailSkeleton } from "@/features/public/ListingDetailSkeleton";

export default function Loading() {
  return (
    <DarPublicShell>
      <ListingDetailSkeleton />
    </DarPublicShell>
  );
}
