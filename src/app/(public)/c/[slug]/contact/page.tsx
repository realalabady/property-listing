import { CompanyContactClient } from "@/features/public/CompanyContactClient";
import { RaeiPublicShell } from "@/features/public/RaeiPublicShell";

export const metadata = {
  title: "تواصل مع الشركة",
};

export default async function CompanyContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <RaeiPublicShell>
      <CompanyContactClient slug={slug} />
    </RaeiPublicShell>
  );
}
