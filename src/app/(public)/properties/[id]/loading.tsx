import { RaeiPublicShell } from "@/features/public/RaeiPublicShell";
import { ListingDetailSkeleton } from "@/features/public/ListingDetailSkeleton";

export default function Loading() {
  return (
    <RaeiPublicShell>
      <ListingDetailSkeleton />
    </RaeiPublicShell>
  );
}
