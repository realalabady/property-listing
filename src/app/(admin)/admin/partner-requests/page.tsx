import { requireSuperAdmin } from "@/lib/auth/guards";
import { adminDb } from "@/lib/firebase/admin";
import { serializeDate } from "@/lib/api/company-leads";
import { AdminPartnerRequestsClient } from "@/features/admin/AdminPartnerRequestsClient";
import { t } from "@/lib/i18n";

export const metadata = {
  title: "طلبات الشراكة",
};

export interface AdminPartnerRequestRow {
  id: string;
  companyName: string;
  contactName: string;
  commercialRegistrationNumber: string;
  email: string;
  phone: string;
  city: string;
  hearAbout: string;
  message: string;
  status: string;
  companyId: string | null;
  createdAt: string | null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function fetchPartnerRequests(): Promise<AdminPartnerRequestRow[]> {
  const snap = await adminDb()
    .collection("partner_requests")
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      companyName: str(data.companyName),
      contactName: str(data.contactName),
      commercialRegistrationNumber: str(data.commercialRegistrationNumber),
      email: str(data.email),
      phone: str(data.phone),
      // Older rows stored a free-text city and no label; fall back to it.
      city: str(data.cityLabel) || str(data.city),
      hearAbout: str(data.hearAboutLabel) || str(data.hearAbout),
      message: str(data.message),
      status: str(data.status) || "new",
      companyId: str(data.companyId) || null,
      createdAt: serializeDate(data.createdAt),
    };
  });
}

export default async function AdminPartnerRequestsPage() {
  await requireSuperAdmin();
  const requests = await fetchPartnerRequests();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("admin.partnerRequestsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("admin.partnerRequestsSubtitle")}
        </p>
      </header>

      <AdminPartnerRequestsClient requests={requests} />
    </div>
  );
}
