"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import type { PayrollBreakdown } from "@/lib/payroll";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useI18n } from "@/components/i18n/I18nProvider";

type Leave = { id: string; type: string; startDate: string; endDate: string; days: number | null; note: string | null; status: string; requestedByEmployee: boolean; reviewNote: string | null };
type File = { id: string; name: string; docType: string | null; size: number; uploadedAt: string };

const LEAVE_KEYS = ["leave", "sick", "unpaid", "other"];
const STATUS_COLOR: Record<string, string> = { pending: "var(--brass)", approved: "var(--emerald-dark)", rejected: "var(--brick)" };

function toDataUrl(file: globalThis.File): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });
}

export function EmployeePortal({ profile, pay, annual, totals, leave, leaves: initLeaves, files: initFiles }: {
  profile: { name: string; position: string | null; department: string | null; hiredAt: string | null; monthsWorked: number; paymentMethod: string | null; iban: string | null; bankName: string | null };
  pay: PayrollBreakdown;
  annual: { gross: number; net: number };
  totals: { net: number; insurances: number; bonuses: number };
  leave: { entitlement: number; usedPaid: number; remaining: number };
  leaves: Leave[]; files: File[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [leaves, setLeaves] = useState(initLeaves);
  const [files, setFiles] = useState(initFiles);
  const [lf, setLf] = useState({ type: "leave", startDate: "", endDate: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submitLeave() {
    if (!lf.startDate || !lf.endDate) { setErr(t("portal.me.errPeriod")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/portal/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lf) });
    setBusy(false);
    if (r.ok) { const nl = await r.json(); setLeaves((p) => [nl, ...p]); setLf({ type: "leave", startDate: "", endDate: "", note: "" }); }
    else setErr((await r.json().catch(() => ({}))).error ?? t("portal.me.errGeneric"));
  }
  async function cancelLeave(id: string) {
    if (!(await confirmDelete(t("portal.me.confirmCancel")))) return;
    const r = await fetch(`/api/portal/leave?leaveId=${id}`, { method: "DELETE" });
    if (r.ok) setLeaves((p) => p.filter((x) => x.id !== id));
  }
  async function upload(file: globalThis.File) {
    if (file.size > 5 * 1024 * 1024) { setErr(t("portal.me.errTooLarge")); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/portal/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl: await toDataUrl(file) }),
    });
    setBusy(false);
    if (r.ok) { const nf = await r.json(); setFiles((p) => [nf, ...p]); }
    else setErr((await r.json().catch(() => ({}))).error ?? t("portal.me.errUpload"));
  }

  const card = { background: "rgba(255,255,255,.5)", borderRadius: 10, padding: "12px 14px" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 2px" }}>{t("portal.me.title")}</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {profile.position ?? t("portal.me.roleFallback")}{profile.department ? ` · ${profile.department}` : ""}
          {profile.hiredAt ? ` · ${t("portal.me.hired", { date: new Date(profile.hiredAt).toLocaleDateString(locale), n: profile.monthsWorked })}` : ""}
        </div>
      </div>

      {/* Заплата и осигуровки — само моите данни */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("portal.me.salaryTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
          {([
            [t("portal.me.gross"), pay.gross, "var(--navy)"],
            [t("portal.me.empSSC"), pay.employeeSSC, "var(--brass)"],
            [t("portal.me.tax"), pay.tax, "var(--brass)"],
            [t("portal.me.net"), pay.net, "var(--emerald-dark)"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: c }}>{formatCurrency(v)}</div></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
          {([
            [t("portal.me.annualGross"), annual.gross, "var(--navy)"],
            [t("portal.me.annualNet"), annual.net, "var(--emerald-dark)"],
            [t("portal.me.totalReceived"), totals.net + totals.bonuses, "var(--emerald-dark)"],
            [t("portal.me.totalInsurances"), totals.insurances, "var(--brass)"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: c }}>{formatCurrency(v)}</div></div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
          {t("portal.me.payNote", { method: profile.paymentMethod === "cash" ? t("portal.me.payCash") : t("portal.me.payBank"), iban: profile.paymentMethod !== "cash" && profile.iban ? ` (${profile.iban}${profile.bankName ? ", " + profile.bankName : ""})` : "" })}
        </div>
      </div>

      {/* Отпуски */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>{t("portal.me.leaveTitle")}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...card, background: "var(--emerald-soft)" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>{t("portal.me.entitlement")}</div><div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{t("portal.me.days", { n: leave.entitlement })}</div></div>
          <div style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>{t("portal.me.used")}</div><div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{t("portal.me.days", { n: leave.usedPaid })}</div></div>
          <div style={{ ...card, background: leave.remaining < 0 ? "var(--brick-soft)" : "var(--brass-soft)" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>{t("portal.me.remaining")}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: leave.remaining < 0 ? "var(--brick)" : "var(--brass)" }}>{t("portal.me.days", { n: leave.remaining })}</div></div>
        </div>

        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{t("portal.me.newLeave")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div><label style={{ fontSize: 11 }}>{t("portal.me.type")}</label><select value={lf.type} onChange={(e) => setLf({ ...lf, type: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{LEAVE_KEYS.map((k) => <option key={k} value={k}>{t(`portal.me.leaveType.${k}`)}</option>)}</select></div>
          <div><label style={{ fontSize: 11 }}>{t("portal.me.from")}</label><input type="date" value={lf.startDate} onChange={(e) => setLf({ ...lf, startDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <div><label style={{ fontSize: 11 }}>{t("portal.me.to")}</label><input type="date" value={lf.endDate} onChange={(e) => setLf({ ...lf, endDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 11 }}>{t("portal.me.note")}</label><input value={lf.note} onChange={(e) => setLf({ ...lf, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={submitLeave}>{t("portal.me.submit")}</button>
        </div>

        {leaves.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("portal.me.noLeaves")}</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {leaves.map((l) => {
              const sColor = STATUS_COLOR[l.status] ?? STATUS_COLOR.approved;
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                  <span>
                    <strong>{t(`portal.me.leaveType.${l.type}`)}</strong> · {new Date(l.startDate).toLocaleDateString(locale)} – {new Date(l.endDate).toLocaleDateString(locale)} ({t("portal.me.days", { n: l.days ?? 0 })})
                    {l.reviewNote ? ` · ${l.reviewNote}` : ""}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: sColor, fontSize: 11.5 }}>{t(`portal.me.status.${l.status}`)}</span>
                    {l.status === "pending" && l.requestedByEmployee && <button onClick={() => cancelLeave(l.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Документи към работодателя */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("portal.me.docsTitle")}</h3>
        <label className="btn btn-primary btn-sm" style={{ cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {busy ? t("portal.me.uploading") : t("portal.me.uploadBtn")}
          <input type="file" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <div style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 10px" }}>{t("portal.me.docsHint")}</div>
        {files.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("portal.me.noDocs")}</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {files.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                <span>{f.docType ? <strong style={{ color: "var(--navy)" }}>{f.docType}</strong> : null}{f.docType ? " · " : ""}<a href={`/api/portal/documents/${f.id}`} style={{ color: "var(--ink)" }}>{f.name}</a><span style={{ color: "var(--muted)" }}> · {(f.size / 1024).toFixed(0)} KB · {new Date(f.uploadedAt).toLocaleDateString(locale)}</span></span>
                <a href={`/api/portal/documents/${f.id}`} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.download /></a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
