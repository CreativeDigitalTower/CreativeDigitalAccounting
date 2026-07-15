"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { isValidEmail, normalizeEmail, type ClientEmailInput } from "@/lib/clientEmails";

export type EmailRow = Required<Pick<ClientEmailInput,
  "email" | "isPrimary" | "isActive" | "receivesInvoices" | "receivesReminders" | "receivesOffers" | "receivesGeneral">> & {
  id?: string; contactName: string; type: string;
};

const TYPES = ["main", "accounting", "manager", "payments", "invoices", "other"] as const;

export function emptyEmailRow(isPrimary = false): EmailRow {
  return {
    email: "", contactName: "", type: "main", isPrimary, isActive: true,
    receivesInvoices: true, receivesReminders: true, receivesOffers: true, receivesGeneral: true,
  };
}

/** Управление на няколко имейл адреса на клиент + предпочитания за получаване. */
export function ClientEmailsEditor({ value, onChange, defaultOpen = true }: {
  value: EmailRow[]; onChange: (rows: EmailRow[]) => void; defaultOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  const [advanced, setAdvanced] = useState<Record<number, boolean>>({});

  function update(i: number, patch: Partial<EmailRow>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function setPrimary(i: number) {
    onChange(value.map((r, idx) => ({ ...r, isPrimary: idx === i, isActive: idx === i ? true : r.isActive })));
  }
  function add() {
    const rows = [...value, emptyEmailRow(value.length === 0)];
    onChange(rows);
  }
  function remove(i: number) {
    const removedPrimary = value[i]?.isPrimary;
    let rows = value.filter((_, idx) => idx !== i);
    if (removedPrimary && rows.length > 0 && !rows.some((r) => r.isPrimary)) {
      rows = rows.map((r, idx) => ({ ...r, isPrimary: idx === 0 }));
    }
    onChange(rows);
  }

  // локална проверка за дубли (case-insensitive)
  const norm = value.map((r) => normalizeEmail(r.email));
  const dupIdx = new Set<number>();
  norm.forEach((e, i) => { if (e && norm.indexOf(e) !== i) dupIdx.add(i); });

  return (
    <div className="glass panel" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("mailattach.emails.title")}</h3>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          {value.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{t("mailattach.emails.empty")}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {value.map((r, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: r.isPrimary ? "var(--emerald-soft, rgba(15,138,106,.06))" : "transparent" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) minmax(120px,1fr) minmax(120px,1fr) auto", gap: 8, alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: 11 }}>{t("mailattach.emails.email")}{r.isPrimary ? " ★" : ""}</label>
                    <input type="email" value={r.email} onChange={(e) => update(i, { email: e.target.value })}
                      placeholder="office@firma.bg" style={r.email && (!isValidEmail(r.email) || dupIdx.has(i)) ? { borderColor: "var(--brick)" } : undefined} />
                    {r.email && !isValidEmail(r.email) && <div style={{ color: "var(--brick)", fontSize: 10.5, marginTop: 2 }}>{t("mailattach.emails.invalid")}</div>}
                    {dupIdx.has(i) && <div style={{ color: "var(--brick)", fontSize: 10.5, marginTop: 2 }}>{t("mailattach.emails.duplicate")}</div>}
                  </div>
                  <div>
                    <label style={{ fontSize: 11 }}>{t("mailattach.emails.contactName")}</label>
                    <input value={r.contactName} onChange={(e) => update(i, { contactName: e.target.value })} placeholder={t("mailattach.emails.contactNamePh")} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11 }}>{t("mailattach.emails.type")}</label>
                    <select value={r.type} onChange={(e) => update(i, { type: e.target.value })}>
                      {TYPES.map((ty) => <option key={ty} value={ty}>{t(`mailattach.emails.types.${ty}`)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" className="btn btn-ghost btn-sm" title={t("mailattach.emails.setPrimary")}
                      onClick={() => setPrimary(i)} disabled={r.isPrimary}
                      style={{ color: r.isPrimary ? "var(--emerald-dark)" : "var(--muted)" }}>★</button>
                    <button type="button" className="btn btn-ghost btn-sm" title={t("mailattach.emails.remove")}
                      onClick={() => remove(i)} style={{ color: "var(--brick)" }}>×</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12, margin: 0 }}>
                    <input type="checkbox" checked={r.isActive} onChange={(e) => update(i, { isActive: e.target.checked })} disabled={r.isPrimary} style={{ width: "auto" }} />
                    {t("mailattach.emails.active")}
                  </label>
                  <button type="button" onClick={() => setAdvanced((s) => ({ ...s, [i]: !s[i] }))}
                    style={{ background: "none", border: "none", color: "var(--navy)", fontSize: 12, cursor: "pointer", padding: 0 }}>
                    {advanced[i] ? t("mailattach.emails.hidePrefs") : t("mailattach.emails.showPrefs")}
                  </button>
                </div>
                {advanced[i] && (
                  <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                    {([
                      ["receivesInvoices", "prefInvoices"], ["receivesReminders", "prefReminders"],
                      ["receivesOffers", "prefOffers"], ["receivesGeneral", "prefGeneral"],
                    ] as const).map(([key, lbl]) => (
                      <label key={key} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12, margin: 0 }}>
                        <input type="checkbox" checked={r[key]} onChange={(e) => update(i, { [key]: e.target.checked } as Partial<EmailRow>)} style={{ width: "auto" }} />
                        {t(`mailattach.emails.${lbl}`)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={add} style={{ marginTop: 12 }}>
            {t("mailattach.emails.add")}
          </button>
        </div>
      )}
    </div>
  );
}
