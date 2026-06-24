"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Регистрира посещение при всяко зареждане на страница (за админ статистика). */
export function VisitTracker({ area = "public" }: { area?: "public" | "app" }) {
  const pathname = usePathname();

  useEffect(() => {
    let vid = localStorage.getItem("cda_vid");
    if (!vid) {
      vid = (crypto.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now());
      localStorage.setItem("cda_vid", vid);
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: vid, path: pathname, area }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, area]);

  return null;
}
