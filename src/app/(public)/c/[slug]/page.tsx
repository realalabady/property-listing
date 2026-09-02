import { CompanyLandingClient } from "@/features/public/CompanyLandingClient";
import { RaeiPublicShell } from "@/features/public/RaeiPublicShell";

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
    <RaeiPublicShell>
      <CompanyLandingClient slug={slug} />
    </RaeiPublicShell>
  );
}
