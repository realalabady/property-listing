import { CompanyPropertiesClient } from "@/features/public/CompanyPropertiesClient";
import { RaeiPublicShell } from "@/features/public/RaeiPublicShell";

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
    <RaeiPublicShell>
      <CompanyPropertiesClient slug={slug} />
    </RaeiPublicShell>
  );
}
