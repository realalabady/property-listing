import { CompanyLandingClient } from "@/features/public/CompanyLandingClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

export const metadata = {
  title: "الشركة",
};

export default async function CompanyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DarPublicShell>
      <CompanyLandingClient slug={slug} />
    </DarPublicShell>
  );
}
