import { CompanyContactClient } from "@/features/public/CompanyContactClient";

export const metadata = {
  title: "تواصل مع الشركة",
};

export default async function CompanyContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyContactClient slug={slug} />;
}
