"use client";

import { useEffect } from "react";

/** Изпраща tracking beacon от публичната страница (без блокиране на UI). */
export function trackDoc(token: string, action: "viewed" | "downloaded" | "printed" | "link_visited") {
  try {
    const body = JSON.stringify({ action });
    const url = `/api/track/document/${token}`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
}

/** Записва „прегледан" при зареждане на публичната страница на документа. */
export function DocTrackBeacon({ token }: { token: string }) {
  useEffect(() => { trackDoc(token, "viewed"); }, [token]);
  return null;
}
