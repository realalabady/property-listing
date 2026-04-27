"use client";

import { useAuthBootstrap } from "@/hooks/useAuth";

/**
 * Mount once near the root to wire Firebase Auth → Zustand store.
 * Renders nothing.
 */
export function AuthBootstrap(): null {
  useAuthBootstrap();
  return null;
}
