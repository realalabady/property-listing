import { CompanyPropertiesClient } from "@/features/public/CompanyPropertiesClient";
import { DarPublicShell } from "@/features/public/DarPublicShell";

export const metadata = {
  title: "عقارات الشركة",
};

export default async function CompanyPropertiesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <DarPublicShell>
      <CompanyPropertiesClient slug={slug} />
    </DarPublicShell>
  );
}
