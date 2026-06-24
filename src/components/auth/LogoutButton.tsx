"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signOut();
      router.push(ROUTES.LOGIN);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? t("dashboard.loggingOut") : t("dashboard.logout")}
    </Button>
  );
}
