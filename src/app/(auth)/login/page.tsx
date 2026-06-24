import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("auth.signInTitle"),
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
