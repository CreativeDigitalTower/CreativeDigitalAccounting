"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import type { PayrollBreakdown } from "@/lib/payroll";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

type Leave = { id: string; type: string; startDate: string; endDate: string; days: number | null; note: string | null; status: string; requestedByEmployee: boolean; reviewNote: string | null };
type File = { id: string; name: string; docType: string | null; size: number; uploadedAt: string };

const LEAVE_LABELS: Record<string, string> = { leave: "Платен отпуск", sick: "Болничен", unpaid: "Неплатен отпуск", other: "Друго" };
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Изчаква одобрение", color: "var(--brass)" },
  approved: { label: "Одобрен", color: "var(--emerald-dark)" },
  rejected: { label: "Отхвърлен", color: "var(--brick)" },
};

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
  const router = useRouter();
  const [leaves, setLeaves] = useState(initLeaves);
  const [files, setFiles] = useState(initFiles);
  const [lf, setLf] = useState({ type: "leave", startDate: "", endDate: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submitLeave() {
    if (!lf.startDate || !lf.endDate) { setErr("Посочете период."); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/portal/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lf) });
    setBusy(false);
    if (r.ok) { const nl = await r.json(); setLeaves((p) => [nl, ...p]); setLf({ type: "leave", startDate: "", endDate: "", note: "" }); }
    else setErr((await r.json().catch(() => ({}))).error ?? "Грешка.");
  }
  async function cancelLeave(id: string) {
    if (!(await confirmDelete("тази заявка"))) return;
    const r = await fetch(`/api/portal/leave?leaveId=${id}`, { method: "DELETE" });
    if (r.ok) setLeaves((p) => p.filter((x) => x.id !== id));
  }
  async function upload(file: globalThis.File) {
    if (file.size > 5 * 1024 * 1024) { setErr("Файлът е твърде голям (макс. 5 MB)."); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/portal/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl: await toDataUrl(file) }),
    });
    setBusy(false);
    if (r.ok) { const nf = await r.json(); setFiles((p) => [nf, ...p]); }
    else setErr((await r.json().catch(() => ({}))).error ?? "Грешка при качване.");
  }

  const card = { background: "rgba(255,255,255,.5)", borderRadius: 10, padding: "12px 14px" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 2px" }}>Моят профил</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {profile.position ?? "Служител"}{profile.department ? ` · ${profile.department}` : ""}
          {profile.hiredAt ? ` · от ${new Date(profile.hiredAt).toLocaleDateString("bg-BG")} (${profile.monthsWorked} мес.)` : ""}
        </div>
      </div>

      {/* Заплата и осигуровки — само моите данни */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Заплата и осигуровки (месечно)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
          {([
            ["Бруто заплата", pay.gross, "var(--navy)"],
            ["Осигуровки (мои)", pay.employeeSSC, "var(--brass)"],
            ["Данък (10%)", pay.tax, "var(--brass)"],
            ["Чиста сума", pay.net, "var(--emerald-dark)"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: c }}>{formatCurrency(v)}</div></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginTop: 10 }}>
          {([
            ["Годишно бруто", annual.gross, "var(--navy)"],
            ["Годишно нето", annual.net, "var(--emerald-dark)"],
            ["Общо получено (прибл.)", totals.net + totals.bonuses, "var(--emerald-dark)"],
            ["Внесени осигуровки (прибл.)", totals.insurances, "var(--brass)"],
          ] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: c }}>{formatCurrency(v)}</div></div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
          Заплата се изплаща {profile.paymentMethod === "cash" ? "в брой" : "по банкова сметка"}{profile.paymentMethod !== "cash" && profile.iban ? ` (${profile.iban}${profile.bankName ? ", " + profile.bankName : ""})` : ""}.
          Сумите „общо/приблизително" са изчислени на база текуща заплата × месеци стаж + бонуси.
        </div>
      </div>

      {/* Отпуски */}
      <div className="glass panel">
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Отпуски</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...card, background: "var(--emerald-soft)" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>Полагаем платен</div><div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{leave.entitlement} дни</div></div>
          <div style={card}><div style={{ fontSize: 11, color: "var(--muted)" }}>Използван (одобрен)</div><div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{leave.usedPaid} дни</div></div>
          <div style={{ ...card, background: leave.remaining < 0 ? "var(--brick-soft)" : "var(--brass-soft)" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>Оставащ</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: leave.remaining < 0 ? "var(--brick)" : "var(--brass)" }}>{leave.remaining} дни</div></div>
        </div>

        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Нова заявка за отпуск</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div><label style={{ fontSize: 11 }}>Вид</label><select value={lf.type} onChange={(e) => setLf({ ...lf, type: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label style={{ fontSize: 11 }}>От</label><input type="date" value={lf.startDate} onChange={(e) => setLf({ ...lf, startDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <div><label style={{ fontSize: 11 }}>До</label><input type="date" value={lf.endDate} onChange={(e) => setLf({ ...lf, endDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 11 }}>Бележка</label><input value={lf.note} onChange={(e) => setLf({ ...lf, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={submitLeave}>Подай заявка</button>
        </div>

        {leaves.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма заявки/отпуски.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {leaves.map((l) => {
              const s = STATUS[l.status] ?? STATUS.approved;
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                  <span>
                    <strong>{LEAVE_LABELS[l.type]}</strong> · {new Date(l.startDate).toLocaleDateString("bg-BG")} – {new Date(l.endDate).toLocaleDateString("bg-BG")} ({l.days} дни)
                    {l.reviewNote ? ` · ${l.reviewNote}` : ""}
                  </span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: s.color, fontSize: 11.5 }}>{s.label}</span>
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
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Мои документи</h3>
        <label className="btn btn-primary btn-sm" style={{ cursor: busy ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {busy ? "Качване…" : "+ Изпрати документ"}
          <input type="file" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <div style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 10px" }}>Изпратените документи се виждат от работодателя за преглед.</div>
        {files.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма документи.</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {files.map((f) => (
              <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
                <span>{f.docType ? <strong style={{ color: "var(--navy)" }}>{f.docType}</strong> : null}{f.docType ? " · " : ""}<a href={`/api/portal/documents/${f.id}`} style={{ color: "var(--ink)" }}>{f.name}</a><span style={{ color: "var(--muted)" }}> · {(f.size / 1024).toFixed(0)} KB · {new Date(f.uploadedAt).toLocaleDateString("bg-BG")}</span></span>
                <a href={`/api/portal/documents/${f.id}`} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.download /></a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
