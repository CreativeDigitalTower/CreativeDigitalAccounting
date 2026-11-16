"use client";
import { useEffect } from "react";
import { useT } from "@/components/i18n/I18nProvider";

/**
 * Модал за преглед на фирменото лого в голям размер (§6). Запазва пропорциите
 * (object-fit: contain — без разтягане/изрязване), затваря се с X и с Escape,
 * работи на мобилни устройства. Ползва съществуващата дизайн система (glass panel).
 */
export function LogoPreviewModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}
      style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel"
        style={{ position: "relative", background: "var(--paper, #fff)", maxWidth: "min(92vw, 640px)", maxHeight: "88vh", padding: 20, display: "flex", flexDirection: "column" }}>
        <button onClick={onClose} aria-label={t("common.actions.close")}
          style={{ position: "absolute", top: 8, right: 10, background: "transparent", border: "none", fontSize: 24, lineHeight: 1, cursor: "pointer", color: "var(--muted)" }}>×</button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 10, padding: 16, overflow: "hidden", minHeight: 160 }}>
          <img src={src} alt={alt}
            style={{ maxWidth: "100%", maxHeight: "72vh", width: "auto", height: "auto", objectFit: "contain", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
