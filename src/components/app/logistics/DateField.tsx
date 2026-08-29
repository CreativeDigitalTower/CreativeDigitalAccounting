"use client";
import { useMemo, useRef, useState } from "react";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { buildMonthMatrix, WEEKDAY_KEYS } from "@/lib/date/week";

// Date picker с ПОНЕДЕЛНИК като първа колона (§18/§20). Вместо native <input type=date>
// (чийто календар следва browser locale и не може да се управлява), рендира собствен
// Monday-first month grid. Стойността е ISO „yyyy-mm-dd", както при date inputs досега.
export function DateField({ value, onChange, style, placeholder, ariaLabel }: {
  value: string; onChange: (v: string) => void; style?: React.CSSProperties; placeholder?: string; ariaLabel?: string;
}) {
  const t = useT();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = value ? new Date(value + "T00:00:00") : null;
  const [view, setView] = useState(() => selected ?? new Date());

  const weeks = useMemo(() => buildMonthMatrix(view.getFullYear(), view.getMonth()), [view]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(view);
  const display = selected ? new Intl.DateTimeFormat(locale).format(selected) : "";

  const cell = (active: boolean, inMonth: boolean): React.CSSProperties => ({
    width: 30, height: 28, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12.5,
    background: active ? "var(--brick)" : "transparent", color: active ? "#fff" : inMonth ? "inherit" : "var(--muted)",
    opacity: inMonth ? 1 : 0.5,
  });

  return (
    <div ref={boxRef} style={{ position: "relative" }}
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget)) setOpen(false); }}>
      <button type="button" aria-label={ariaLabel} onClick={() => setOpen((o) => !o)}
        style={{ textAlign: "left", cursor: "pointer", background: "rgba(255,255,255,.7)", border: "1px solid var(--border)", borderRadius: 8, ...style }}>
        {display || <span style={{ color: "var(--muted)" }}>{placeholder ?? "—"}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 60, top: "100%", left: 0, marginTop: 4, background: "var(--paper,#fff)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)", width: 250 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel}</span>
            <button type="button" className="btn btn-ghost btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
            {WEEKDAY_KEYS.map((k) => (
              <div key={k} style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", padding: "2px 0" }}>{t(`logistics.calendar.${k}`)}</div>
            ))}
            {weeks.flat().map((c) => (
              <button key={c.iso} type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(c.iso); setOpen(false); }}
                style={cell(c.iso === value, c.inMonth)}>{c.day}</button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onMouseDown={(e) => e.preventDefault()} onClick={() => { const d = new Date(); onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); setOpen(false); }}>{t("logistics.calendar.today")}</button>
            {value && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setOpen(false); }}>{t("logistics.calendar.clear")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
