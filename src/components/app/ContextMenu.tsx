"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type MenuItem = { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; divider?: boolean };

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // да не излиза извън екрана
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 210);
  const top = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 9999) - items.length * 36 - 16);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} className="glass pop-in" style={{ position: "fixed", left, top, zIndex: 4000, minWidth: 190, borderRadius: 10, padding: 5, boxShadow: "0 12px 36px rgba(0,0,0,.22)" }}>
      {items.map((it, i) => it.divider ? (
        <div key={i} style={{ height: 1, background: "var(--border)", margin: "4px 6px" }} />
      ) : (
        <button key={i} onClick={() => { it.onClick(); onClose(); }}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 11px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 7, fontSize: 13, textAlign: "left", color: it.danger ? "var(--brick)" : "var(--ink)", fontFamily: "inherit" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = it.danger ? "var(--brick-soft)" : "rgba(15,138,106,.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          {it.icon && <span style={{ width: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{it.icon}</span>}
          {it.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
