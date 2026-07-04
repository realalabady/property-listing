import { CompanyContactClient } from "@/features/public/CompanyContactClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

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
    <DarPublicShell>
      <CompanyContactClient slug={slug} />
    </DarPublicShell>
  );
}
