"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DOC_STATUSES } from "@/lib/constants";

export const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  muted: { bg: "rgba(120,120,120,.12)", fg: "var(--muted)", dot: "var(--muted)" },
  navy: { bg: "var(--navy-soft)", fg: "var(--navy)", dot: "var(--navy)" },
  brass: { bg: "var(--brass-soft)", fg: "var(--brass)", dot: "var(--brass)" },
  emerald: { bg: "var(--emerald-soft)", fg: "var(--emerald-dark)", dot: "var(--emerald)" },
  brick: { bg: "var(--brick-soft)", fg: "var(--brick)", dot: "var(--brick)" },
};

export function statusMeta(status: string) {
  const s = DOC_STATUSES.find((x) => x.value === status) ?? DOC_STATUSES[0];
  return { label: s.label, ...(STATUS_STYLE[s.color] ?? STATUS_STYLE.muted) };
}

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", onClick); window.removeEventListener("scroll", onScroll, true); };
  }, []);

  function openMenu() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const menuH = DOC_STATUSES.length * 34 + 12;
      const below = r.bottom + 6;
      const top = below + menuH > window.innerHeight ? Math.max(8, r.top - menuH - 6) : below;
      setPos({ left: Math.min(r.left, window.innerWidth - 190), top });
    }
    setOpen(true);
  }

  async function change(next: string) {
    setOpen(false);
    if (next === current) return;
    setSaving(true);
    setCurrent(next);
    const res = await fetch(`/api/documents/${id}/status`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (res.ok) router.refresh();
  }

  const m = statusMeta(current);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button" disabled={saving} onClick={openMenu} title="Смени статус"
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 11px", borderRadius: 20,
          background: m.bg, color: m.fg, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
          fontFamily: "inherit", opacity: saving ? 0.6 : 1, transition: "filter .15s",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
        {saving ? "…" : m.label}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="glass pop-in" onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 4000, borderRadius: 10, padding: 5, minWidth: 180, boxShadow: "0 12px 36px rgba(0,0,0,.22)" }}>
          {DOC_STATUSES.map((s) => {
            const st = STATUS_STYLE[s.color] ?? STATUS_STYLE.muted;
            return (
              <button key={s.value} type="button" onClick={() => change(s.value)}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 11px", border: "none", background: s.value === current ? "rgba(15,138,106,.06)" : "transparent", cursor: "pointer", borderRadius: 7, fontSize: 12.5, textAlign: "left", fontWeight: s.value === current ? 700 : 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15,138,106,.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = s.value === current ? "rgba(15,138,106,.06)" : "transparent")}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot }} />
                {s.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
