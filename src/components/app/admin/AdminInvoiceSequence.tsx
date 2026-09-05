"use client";
import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";

type Seq = { lastRegularNumber: string | null; nextNumber: string; overrideSet: boolean };

// Super Admin: преглед/промяна на следващия фактурен номер за КОНКРЕТНА фирма (§12), през
// admin API-то — без директно редактиране на базата. Lazy fetch (само при отваряне).
export function AdminInvoiceSequence({ companyId }: { companyId: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [seq, setSeq] = useState<Seq | null>(null);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true); setErr("");
    const r = await fetch(`/api/admin/invoice-sequence?companyId=${companyId}`);
    if (r.ok) { const j = await r.json(); setSeq(j.sequence); setVal(j.sequence.nextNumber); }
    else setErr(t("account.numbering.err"));
  }
  async function save() {
    setErr(""); setBusy(true);
    const r = await fetch(`/api/admin/invoice-sequence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, nextNumber: val }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("account.numbering.err")); return; }
    setSeq(j.sequence); setVal(j.sequence.nextNumber);
  }

  return (
    <div style={{ fontSize: 12 }}>
      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} onClick={toggle}>
        {open ? "▾" : "▸"} {t("account.numbering.title")}
      </button>
      {open && seq && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "var(--muted)" }}>{t("account.numbering.lastUsed")}: <span className="num">{seq.lastRegularNumber ?? "—"}</span></span>
          <span style={{ color: "var(--muted)" }}>{t("account.numbering.next")}: <span className="num" style={{ fontWeight: 600 }}>{seq.nextNumber}</span></span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 130, fontFamily: "'IBM Plex Mono', monospace", padding: "4px 6px", fontSize: 12 }} />
            <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "2px 8px" }} disabled={busy} onClick={save}>{t("account.numbering.save")}</button>
          </div>
          {err && <span style={{ color: "var(--brick)" }}>{err}</span>}
        </div>
      )}
    </div>
  );
}
