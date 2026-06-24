import Link from "next/link";
import { requireCompanyMember } from "@/lib/auth/guards";
import { ROUTES } from "@/constants/routes";

export const metadata = {
  title: "Edit Listing",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCompanyMember();
  const { id } = await params;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Edit Listing</h2>
        <p className="text-sm text-muted-foreground">
          Listing ID: <span className="font-medium text-foreground">{id}</span>
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Dedicated edit screens are queued for the next sprint. You can update
          status and feature flags from inventory right now.
        </p>
        <Link
          href={ROUTES.DASHBOARD_LISTINGS}
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Return to listings inventory
        </Link>
      </section>
    </div>
  );
}
