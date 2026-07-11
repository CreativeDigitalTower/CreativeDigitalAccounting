"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/config";
import { useI18n } from "./I18nProvider";

/** Постоянно видим превключвател на езика. Сменя езика без logout/рестарт на сесията. */
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function pick(code: string) {
    setOpen(false);
    if (code === locale) return;
    setBusy(true);
    // Локален fallback веднага + сървърно запазване (бисквитка + профил при логнат).
    document.cookie = `cda_locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    try { localStorage.setItem("cda_locale", code); } catch {}
    try { await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: code }) }); } catch {}
    router.refresh();
    setBusy(false);
  }

  const fg = dark ? "#E9E7DA" : "var(--ink-soft)";
  const border = dark ? "rgba(255,255,255,.18)" : "var(--border)";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} disabled={busy} aria-label="Language" style={{
        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
        background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.5)", border: `1px solid ${border}`,
        borderRadius: 20, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, color: fg, fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 14 }}>{current.flag}</span>{current.label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .7 }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="glass" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: 168, borderRadius: 10, padding: 5, zIndex: 200, boxShadow: "0 12px 34px rgba(20,30,25,.2)" }}>
          {LOCALES.map((l) => (
            <button key={l.code} onClick={() => pick(l.code)} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", cursor: "pointer",
              background: l.code === locale ? "rgba(15,138,106,.1)" : "transparent", border: "none", borderRadius: 7,
              padding: "8px 10px", fontSize: 13, color: "var(--ink)", fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 15 }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.native}</span>
              {l.code === locale && <span style={{ color: "var(--emerald)", fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
