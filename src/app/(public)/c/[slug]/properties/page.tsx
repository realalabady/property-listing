import { CompanyPropertiesClient } from "@/features/public/CompanyPropertiesClient";

export const metadata = {
  title: "عقارات الشركة",
};

export default async function CompanyPropertiesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyPropertiesClient slug={slug} />;
}
