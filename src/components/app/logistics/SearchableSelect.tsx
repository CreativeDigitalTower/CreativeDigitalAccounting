"use client";
import { useMemo, useRef, useState } from "react";

// Преизползваем searchable dropdown (за автомобили/продукти/превозвачи…). Phase 3
// ще го ползва директно при създаване на курс: пишеш „ST86" → предлага ST8669AE.
export type Option = { value: string; label: string; keywords?: string };

export function SearchableSelect({
  options, value, onChange, placeholder = "", allowEmpty = true, emptyLabel = "—",
  allowCreate = false, createLabel,
}: {
  options: Option[]; value: string; onChange: (v: string) => void;
  placeholder?: string; allowEmpty?: boolean; emptyLabel?: string;
  /** Позволява въвеждане на нова стойност директно (creatable combobox). */
  allowCreate?: boolean; createLabel?: (q: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => (o.label + " " + (o.keywords ?? "")).toLowerCase().includes(s));
  }, [q, options]);
  const selected = options.find((o) => o.value === value);
  // Creatable: ако търсеното не съвпада точно с опция → предлагай „+ Добави „…"".
  const qTrim = q.trim();
  const exactMatch = options.some((o) => o.label.toLowerCase() === qTrim.toLowerCase());
  const showCreate = allowCreate && qTrim.length > 0 && !exactMatch;
  const display = selected ? selected.label : (allowCreate && value ? value : "");

  return (
    <div ref={boxRef} style={{ position: "relative" }}
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: "100%", textAlign: "left", padding: "6px 9px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "rgba(255,255,255,.7)", cursor: "pointer" }}>
        {display || <span style={{ color: "var(--muted)" }}>{placeholder || emptyLabel}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, background: "var(--paper,#fff)", border: "1px solid var(--border)", borderRadius: 8, marginTop: 3, maxHeight: 260, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            style={{ width: "100%", padding: "7px 9px", fontSize: 13, border: "none", borderBottom: "1px solid var(--border)", outline: "none" }} />
          {allowEmpty && (
            <div role="option" tabIndex={0} onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ padding: "7px 9px", fontSize: 13, cursor: "pointer", color: "var(--muted)" }}>{emptyLabel}</div>
          )}
          {filtered.map((o) => (
            <div key={o.value} role="option" tabIndex={0}
              onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
              style={{ padding: "7px 9px", fontSize: 13, cursor: "pointer", background: o.value === value ? "rgba(15,138,106,.1)" : "transparent" }}>
              {o.label}
            </div>
          ))}
          {showCreate && (
            <div role="option" tabIndex={0} onClick={() => { onChange(qTrim); setOpen(false); setQ(""); }}
              style={{ padding: "7px 9px", fontSize: 13, cursor: "pointer", fontWeight: 600, color: "var(--brick)" }}>
              {createLabel ? createLabel(qTrim) : `+ „${qTrim}"`}
            </div>
          )}
          {filtered.length === 0 && !showCreate && <div style={{ padding: "8px 9px", fontSize: 12.5, color: "var(--muted)" }}>—</div>}
        </div>
      )}
    </div>
  );
}
