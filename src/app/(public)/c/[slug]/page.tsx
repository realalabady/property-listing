import { CompanyLandingClient } from "@/features/public/CompanyLandingClient";

export const metadata = {
  title: "الشركة",
};

export default async function CompanyLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CompanyLandingClient slug={slug} />;
}
