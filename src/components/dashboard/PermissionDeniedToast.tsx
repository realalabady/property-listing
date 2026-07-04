"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Fires a single toast when the user was bounced from a page they lack
 * permission for (server guards redirect to `?denied=permission`). The fixed
 * toast `id` de-duplicates rapid repeat attempts — mashing a forbidden link
 * updates the same toast instead of stacking dozens. The flag is then stripped
 * from the URL so a refresh doesn't re-trigger it.
 */
export function PermissionDeniedToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const denied = params.get("denied");

  useEffect(() => {
    if (denied !== "permission") return;

    toast.error("ليس لديك صلاحية للوصول إلى هذه الصفحة.", {
      id: "permission-denied",
    });

    router.replace(pathname, { scroll: false });
  }, [denied, pathname, router]);

  return null;
}
