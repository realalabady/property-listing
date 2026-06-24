import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("auth.signInTitle"),
};

export default function SignupPage() {
  redirect(ROUTES.LOGIN);
}
