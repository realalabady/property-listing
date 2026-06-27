import { Suspense } from "react";
import CustomerSignupForm from "./CustomerSignupForm";

export const metadata = {
  title: "إنشاء حساب عميل",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <CustomerSignupForm />
    </Suspense>
  );
}
