"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the current route on an interval while `active` is true. */
export function AutoRefresh({ active, intervalMs = 2500 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);
  return null;
}
