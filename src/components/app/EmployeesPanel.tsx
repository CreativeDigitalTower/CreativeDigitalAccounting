"use client";
import { NumberField } from "@/components/i18n/NumberField";

import { useEffect, useState, Fragment } from "react";
import { formatCurrency } from "@/lib/constants";
import { calcPayroll, sumPayroll, EMPLOYEE_SSC_RATE, EMPLOYER_SSC_RATE } from "@/lib/payroll";
import { confirmDelete } from "@/lib/confirmDelete";
import { UiIcon } from "@/components/app/NavIcons";
import { EMPLOYEE_ACCESS_MODULES, type EmployeeAccess } from "@/lib/employeeAccess";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { TFunc } from "@/lib/i18n/messages";

type Leave = { id: string; type: string; startDate: string; endDate: string; days: number | null; note: string | null; docName?: string | null; status?: string; requestedByEmployee?: boolean; reviewNote?: string | null };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });
}
type EmpFile = { id: string; name: string; docType: string | null; mimeType: string; size: number; uploadedAt: string };
type Employee = {
  id: string; name: string; position: string | null; phone: string | null; email: string | null;
  address: string | null; salary: number | null; hiredAt: string | null; paidLeaveDays: number; notes: string | null; active: boolean;
  department?: string | null; contractType?: string | null; paymentMethod?: string | null; iban?: string | null; bankName?: string | null;
  userId?: string | null;
  leaves?: Leave[];
};

const CONTRACT_KEYS = ["permanent", "fixed_term", "civil"];
const LEAVE_KEYS = ["leave", "sick", "unpaid", "other"];
const BONUS_KEYS = ["cash", "voucher", "performance", "holiday", "other"];
const monthName = (locale: string, i: number) => new Date(2000, i, 1).toLocaleDateString(locale, { month: "long" });
const empty = { name: "", position: "", phone: "", email: "", address: "", salary: "", hiredAt: "", paidLeaveDays: "20", notes: "", department: "", contractType: "permanent", paymentMethod: "bank", iban: "", bankName: "" };

export function EmployeesPanel({ initial, access }: { initial: Employee[]; access: EmployeeAccess }) {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/employees");
    if (r.ok) {
      const list = await r.json();
      // запази leaves от текущото състояние
      setEmployees(list);
    }
  }

  function startAdd() { setForm(empty); setEditing(null); setShowForm(true); setError(""); }
  function startEdit(e: Employee) {
    setForm({
      name: e.name, position: e.position ?? "", phone: e.phone ?? "", email: e.email ?? "",
      address: e.address ?? "", salary: e.salary != null ? String(e.salary) : "", hiredAt: e.hiredAt?.slice(0, 10) ?? "",
      paidLeaveDays: String(e.paidLeaveDays ?? 20), notes: e.notes ?? "",
      department: e.department ?? "", contractType: e.contractType ?? "permanent",
      paymentMethod: e.paymentMethod ?? "bank", iban: e.iban ?? "", bankName: e.bankName ?? "",
    });
    setEditing(e.id); setShowForm(true); setError("");
  }

  async function save() {
    setError("");
    const body = {
      ...form, salary: form.salary ? Number(form.salary) : null, hiredAt: form.hiredAt || null,
      paidLeaveDays: form.paidLeaveDays ? Number(form.paidLeaveDays) : 20,
    };
    const res = await fetch(editing ? `/api/employees/${editing}` : "/api/employees", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) { setShowForm(false); reload(); }
    else setError((await res.json()).error ?? t("employees.errSave"));
  }

  async function remove(id: string) {
    if (!confirm(t("employees.confirmDeleteEmployee"))) return;
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) setEmployees((e) => e.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>{t("employees.title")}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("employees.count", { n: employees.length })}</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>{t("employees.addBtn")}</button>
      </div>

      <EmployeeAccessSettings initial={access} />

      {(() => {
        const gross = employees.filter((e) => e.active).map((e) => e.salary ?? 0);
        const pr = sumPayroll(gross);
        if (gross.length === 0 || pr.gross === 0) return null;
        const cards: [string, number, string][] = [
          [t("employees.payroll.employerCost"), pr.employerCost, "var(--brick)"],
          [t("employees.payroll.gross"), pr.gross, "var(--navy)"],
          [t("employees.payroll.insurances"), pr.insurancesTotal, "var(--brass)"],
          [t("employees.payroll.netTotal"), pr.net, "var(--emerald-dark)"],
        ];
        return (
          <div className="glass panel" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>{t("employees.payroll.title")}</h3>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 12px" }}>
              {t("employees.payroll.rateNote", { emp: (EMPLOYEE_SSC_RATE * 100).toFixed(2), empr: (EMPLOYER_SSC_RATE * 100).toFixed(2) })}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 12 }}>
              {cards.map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 3 }}>{l}</div>
                  <div className="num" style={{ fontSize: 19, fontWeight: 700, color: c }}>{formatCurrency(v)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {showForm && (
        <div className="glass panel" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? t("employees.form.editTitle") : t("employees.form.newTitle")}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>
            <div><label>{t("employees.form.name")}</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>{t("employees.form.position")}</label><input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><label>{t("employees.form.phone")}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>{t("employees.form.email")}</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label>{t("employees.form.salary")}</label><NumberField value={form.salary} onChange={(v) => setForm({ ...form, salary: v })} /></div>
            <div><label>{t("employees.form.hiredAt")}</label><input type="date" value={form.hiredAt} onChange={(e) => setForm({ ...form, hiredAt: e.target.value })} /></div>
            <div><label>{t("employees.form.leaveDays")}</label><input type="number" min="0" value={form.paidLeaveDays} onChange={(e) => setForm({ ...form, paidLeaveDays: e.target.value })} /></div>
            <div><label>{t("employees.form.department")}</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div><label>{t("employees.form.contractType")}</label>
              <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                {CONTRACT_KEYS.map((k) => <option key={k} value={k}>{t(`employees.contract.${k}`)}</option>)}
              </select>
            </div>
            <div><label>{t("employees.form.paymentMethod")}</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="bank">{t("employees.form.payBank")}</option>
                <option value="cash">{t("employees.form.payCash")}</option>
              </select>
            </div>
            {form.paymentMethod === "bank" && <>
              <div><label>{t("employees.form.iban")}</label><input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="BG.." /></div>
              <div><label>{t("employees.form.bank")}</label><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
            </>}
            <div style={{ gridColumn: "1 / -1" }}><label>{t("employees.form.address")}</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("employees.form.notes")}</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>{t("employees.form.cancel")}</button>
            <button className="btn btn-primary btn-sm" onClick={save}>{t("employees.form.save")}</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><UiIcon.people width={34} height={34} /></div>
            <div style={{ fontSize: 14 }}>{t("employees.empty")}</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>{t("employees.th.name")}</th><th>{t("employees.th.position")}</th><th>{t("employees.th.phone")}</th><th>{t("employees.th.email")}</th><th className="num">{t("employees.th.salary")}</th><th></th></tr></thead>
            <tbody>
              {employees.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td style={{ fontWeight: 600 }}>
                      <button onClick={() => setOpen(open === e.id ? null : e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
                        {open === e.id ? "▼ " : "▶ "}{e.name}
                      </button>
                    </td>
                    <td style={{ fontSize: 13 }}>{e.position ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{e.phone ?? "—"}</td>
                    <td style={{ fontSize: 13 }}>{e.email ?? "—"}</td>
                    <td className="num">{e.salary != null ? e.salary.toFixed(2) : "—"}</td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)} title={t("employees.editTitle")} style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(e.id)}>{t("employees.delete")}</button>
                    </td>
                  </tr>
                  {open === e.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "rgba(0,0,0,.02)", padding: "14px 18px" }}>
                        <LeavePanel employee={e} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function LeavePanel({ employee }: { employee: Employee }) {
  const { t, locale } = useI18n();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ type: "leave", startDate: "", endDate: "", note: "" });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    // зареждане на отпуски за служителя
    fetch(`/api/employees/${employee.id}/leaves/list`).then(async (r) => {
      if (r.ok) setLeaves(await r.json());
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [employee.id]);

  async function add() {
    if (!form.startDate || !form.endDate) return;
    setErr("");
    let doc: { docName: string; docMimeType: string; docDataUrl: string } | null = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setErr(t("employees.leaveForm.fileTooLarge")); return; }
      doc = { docName: file.name, docMimeType: file.type || "application/octet-stream", docDataUrl: await fileToDataUrl(file) };
    }
    const res = await fetch(`/api/employees/${employee.id}/leaves`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...doc }),
    });
    if (res.ok) { const l = await res.json(); setLeaves((p) => [l, ...p]); setForm({ type: "leave", startDate: "", endDate: "", note: "" }); setFile(null); }
    else setErr((await res.json()).error ?? t("employees.errSave"));
  }

  // Замяна/прикачване на документ към съществуващ отпуск
  async function attachDoc(leaveId: string, f: File) {
    if (f.size > 5 * 1024 * 1024) { setErr(t("employees.leaveForm.fileTooLarge")); return; }
    const r = await fetch(`/api/employees/${employee.id}/leaves/${leaveId}/doc`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docName: f.name, docMimeType: f.type || "application/octet-stream", docDataUrl: await fileToDataUrl(f) }),
    });
    if (r.ok) setLeaves((p) => p.map((x) => x.id === leaveId ? { ...x, docName: f.name } : x));
  }
  async function removeDoc(leaveId: string) {
    if (!(await confirmDelete(t("employees.leaves.confirmDelDoc")))) return;
    const r = await fetch(`/api/employees/${employee.id}/leaves/${leaveId}/doc`, { method: "DELETE" });
    if (r.ok) setLeaves((p) => p.map((x) => x.id === leaveId ? { ...x, docName: null } : x));
  }
  async function del(id: string) {
    if (!(await confirmDelete(t("employees.leaves.confirmDelLeave")))) return;
    const res = await fetch(`/api/employees/${employee.id}/leaves?leaveId=${id}`, { method: "DELETE" });
    if (res.ok) setLeaves((p) => p.filter((x) => x.id !== id));
  }

  // В използваните дни се броят само ОДОБРЕНИТЕ отпуски (чакащите заявки — не).
  const approved = (l: Leave) => (l.status ?? "approved") === "approved";
  const usedPaid = leaves.filter((l) => l.type === "leave" && approved(l)).reduce((s, l) => s + (l.days ?? 0), 0);
  const usedUnpaid = leaves.filter((l) => l.type === "unpaid" && approved(l)).reduce((s, l) => s + (l.days ?? 0), 0);
  const totalSick = leaves.filter((l) => l.type === "sick" && approved(l)).reduce((s, l) => s + (l.days ?? 0), 0);
  const pending = leaves.filter((l) => l.status === "pending");

  async function review(id: string, action: "approve" | "reject") {
    const r = await fetch(`/api/employees/${employee.id}/leaves/${id}/review`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    if (r.ok) setLeaves((p) => p.map((x) => x.id === id ? { ...x, status: action === "approve" ? "approved" : "rejected" } : x));
  }
  const entitlement = employee.paidLeaveDays ?? 20;
  const remaining = entitlement - usedPaid;

  const pay = calcPayroll(employee.salary ?? 0);

  return (
    <div>
      {/* Основни данни */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, fontSize: 12 }}>
        {employee.department && <span style={{ background: "rgba(255,255,255,.5)", borderRadius: 12, padding: "2px 10px" }}>{t("employees.detail.dept")} <strong>{employee.department}</strong></span>}
        {employee.contractType && <span style={{ background: "rgba(255,255,255,.5)", borderRadius: 12, padding: "2px 10px" }}>{t("employees.detail.contract")} <strong>{(() => { const l = t(`employees.contract.${employee.contractType}`); return l.startsWith("employees.") ? employee.contractType : l; })()}</strong></span>}
        <span style={{ background: "rgba(255,255,255,.5)", borderRadius: 12, padding: "2px 10px" }}>{t("employees.detail.salary")} <strong>{employee.paymentMethod === "cash" ? t("employees.detail.payCashShort") : t("employees.detail.payBankShort")}</strong></span>
        {employee.paymentMethod !== "cash" && employee.iban && <span style={{ background: "rgba(255,255,255,.5)", borderRadius: 12, padding: "2px 10px" }}>{t("employees.detail.iban")} <strong>{employee.iban}</strong>{employee.bankName ? ` (${employee.bankName})` : ""}</span>}
      </div>
      {employee.address && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>{t("employees.detail.address")} {employee.address}</div>}
      {employee.notes && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>{t("employees.detail.notes")} {employee.notes}</div>}

      {/* Достъп до портала за служители */}
      <PortalInvite employee={employee} />

      {/* Бонуси */}
      <BonusesPanel employeeId={employee.id} />

      {/* Разбивка на заплатата */}
      {(employee.salary ?? 0) > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{t("employees.breakdown.title")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
            {([
              [t("employees.breakdown.gross"), pay.gross, "var(--navy)"],
              [t("employees.breakdown.empSSC"), pay.employeeSSC, "var(--brass)"],
              [t("employees.breakdown.tax"), pay.tax, "var(--brass)"],
              [t("employees.breakdown.net"), pay.net, "var(--emerald-dark)"],
              [t("employees.breakdown.emprSSC"), pay.employerSSC, "var(--brass)"],
              [t("employees.breakdown.companyCost"), pay.employerCost, "var(--brick)"],
            ] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: c }}>{formatCurrency(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Архив с документи */}
      <FilesPanel employeeId={employee.id} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10, marginBottom: 12 }}>
        <div style={{ background: "var(--emerald-soft)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("employees.leaveStats.entitlement")}</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{t("employees.days", { n: entitlement })}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("employees.leaveStats.usedPaid")}</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{t("employees.days", { n: usedPaid })}</div>
        </div>
        <div style={{ background: remaining < 0 ? "var(--brick-soft)" : "var(--brass-soft)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("employees.leaveStats.remaining")}</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700, color: remaining < 0 ? "var(--brick)" : "var(--brass)" }}>{t("employees.days", { n: remaining })}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{t("employees.leaveStats.unpaidSick")}</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{usedUnpaid} / {t("employees.days", { n: totalSick })}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div><label style={{ fontSize: 11 }}>{t("employees.leaveForm.type")}</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{LEAVE_KEYS.map((k) => <option key={k} value={k}>{t(`employees.leave.${k}`)}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>{t("employees.leaveForm.from")}</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>{t("employees.leaveForm.to")}</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 11 }}>{t("employees.leaveForm.note")}</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div>
          <label style={{ fontSize: 11 }}>{t("employees.leaveForm.docOptional")}</label>
          <div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
              {file ? file.name.slice(0, 18) : t("employees.leaveForm.attach")}
              <input type="file" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); }} />
            </label>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add}>{t("employees.leaveForm.add")}</button>
      </div>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", margin: "4px 0 6px" }}>{t("employees.leaves.sectionTitle")}</div>
      {/* Чакащи заявки от служителя за одобрение */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--brass-soft)", borderRadius: 8, border: "1px solid rgba(166,130,47,.35)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brass)", marginBottom: 6 }}>{t("employees.leaves.pendingTitle", { n: pending.length })}</div>
          {pending.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 0" }}>
              <span><strong>{t(`employees.leave.${l.type}`)}</strong> · {new Date(l.startDate).toLocaleDateString(locale)} – {new Date(l.endDate).toLocaleDateString(locale)} ({t("employees.days", { n: l.days ?? 0 })}){l.note ? ` · ${l.note}` : ""}</span>
              <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={() => review(l.id, "approve")}>{t("employees.leaves.approve")}</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)", borderColor: "var(--brick)" }} onClick={() => review(l.id, "reject")}>{t("employees.leaves.reject")}</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("employees.loading")}</div> : leaves.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("employees.leaves.none")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {leaves.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>
                <strong>{t(`employees.leave.${l.type}`)}</strong> · {new Date(l.startDate).toLocaleDateString(locale)} – {new Date(l.endDate).toLocaleDateString(locale)} ({t("employees.days", { n: l.days ?? 0 })}){l.note ? ` · ${l.note}` : ""}
                {l.status === "pending" && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--brass)" }}>{t("employees.leaves.pendingTag")}</span>}
                {l.status === "rejected" && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--brick)" }}>{t("employees.leaves.rejectedTag")}</span>}
                {l.docName && (
                  <a href={`/api/employees/${employee.id}/leaves/${l.id}/doc`} style={{ marginLeft: 8, color: "var(--navy)", fontWeight: 600 }}>↓ {l.docName}</a>
                )}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <label style={{ cursor: "pointer", color: "var(--muted)", fontSize: 11.5 }} title={l.docName ? t("employees.leaves.replaceTitle") : t("employees.leaves.attachTitle")}>
                  {l.docName ? t("employees.leaves.replace") : t("employees.leaves.addDoc")}
                  <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) attachDoc(l.id, f); e.target.value = ""; }} />
                </label>
                {l.docName && <button onClick={() => removeDoc(l.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11.5 }}>{t("employees.leaves.delDoc")}</button>}
                <button onClick={() => del(l.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DOC_TYPE_KEYS = ["contract", "annex", "leaveRequest", "resignation", "sickNote", "jobDescription", "other"];
const docTypeLabel = (t: TFunc, v: string | null) => { if (!v) return ""; const l = t(`employees.files.types.${v}`); return l.startsWith("employees.") ? v : l; };
type Bonus = { id: string; year: number; month: number; amount: number; kind: string; note: string | null };

function EmployeeAccessSettings({ initial }: { initial: EmployeeAccess }) {
  const { t } = useI18n();
  const [acc, setAcc] = useState<EmployeeAccess>(initial);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const enabledCount = Object.values(acc).filter(Boolean).length;

  async function save(next: EmployeeAccess) {
    setAcc(next); setMsg("");
    const r = await fetch("/api/company/employee-access", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
    });
    setMsg(r.ok ? t("employees.access.saved") : ((await r.json().catch(() => ({}))).error ?? t("employees.access.errShort")));
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="glass panel" style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: 0 }}>
        <span style={{ color: "var(--muted)" }}>{open ? "▼" : "▶"}</span>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700 }}>{t("employees.access.header")}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{enabledCount === 0 ? t("employees.access.nothingShared") : t("employees.access.modulesCount", { n: enabledCount })}{msg && <strong style={{ color: "var(--emerald-dark)", marginLeft: 8 }}>{msg}</strong>}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }} dangerouslySetInnerHTML={{ __html: t("employees.access.intro") }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 10 }}>
            {EMPLOYEE_ACCESS_MODULES.map((m) => (
              <label key={m.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontWeight: 400 }}>
                <input type="checkbox" checked={acc[m.key]} onChange={(e) => save({ ...acc, [m.key]: e.target.checked })} style={{ width: "auto", marginTop: 2 }} />
                <span>
                  <span style={{ fontSize: 13, fontWeight: 600, display: "block" }}>{t(`employees.access.modules.${m.key}.label`)}</span>
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t(`employees.access.modules.${m.key}.note`)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PortalInvite({ employee }: { employee: Employee }) {
  const { t } = useI18n();
  const [linked, setLinked] = useState(!!employee.userId);
  const [email, setEmail] = useState(employee.email ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function invite() {
    if (!email) { setMsg(t("employees.portal.needEmail")); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`/api/employees/${employee.id}/invite`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (r.ok) { setLinked(true); setMsg(t("employees.portal.invited")); }
    else setMsg((await r.json().catch(() => ({}))).error ?? t("employees.portal.err"));
  }
  async function revoke() {
    if (!(await confirmDelete(t("employees.portal.confirmRevoke")))) return;
    setBusy(true);
    const r = await fetch(`/api/employees/${employee.id}/invite`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) { setLinked(false); setMsg(t("employees.portal.revoked")); }
  }

  return (
    <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(15,138,106,.06)", borderRadius: 8, border: "1px solid rgba(15,138,106,.2)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--emerald-dark)", marginBottom: 6 }}>{t("employees.portal.title")}</div>
      {linked ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5 }}>
          <span>{t("employees.portal.activeAccess", { email: employee.email ?? "" })}</span>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={revoke} style={{ color: "var(--brick)", borderColor: "var(--brick)" }}>{t("employees.portal.revoke")}</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("employees.portal.emailPh")} style={{ padding: "6px 9px", fontSize: 12.5, flex: 1, minWidth: 180 }} />
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={invite}>{t("employees.portal.invite")}</button>
        </div>
      )}
      {msg && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{msg}</div>}
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{t("employees.portal.hint")}</div>
    </div>
  );
}

function BonusesPanel({ employeeId }: { employeeId: string }) {
  const { t, locale } = useI18n();
  const [list, setList] = useState<Bonus[]>([]);
  const [loaded, setLoaded] = useState(false);
  const now = new Date();
  const [f, setF] = useState({ year: String(now.getFullYear()), month: String(now.getMonth()), amount: "", kind: "cash", note: "" });

  useEffect(() => {
    fetch(`/api/employees/${employeeId}/bonuses`).then(async (r) => {
      if (r.ok) setList(await r.json());
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [employeeId]);

  async function add() {
    if (!f.amount) return;
    const r = await fetch(`/api/employees/${employeeId}/bonuses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: Number(f.year), month: Number(f.month), amount: Number(f.amount), kind: f.kind, note: f.note || null }),
    });
    if (r.ok) { const b = await r.json(); setList((p) => [b, ...p]); setF({ ...f, amount: "", note: "" }); }
  }
  async function del(id: string) {
    if (!(await confirmDelete(t("employees.bonuses.confirmDelete")))) return;
    const r = await fetch(`/api/employees/${employeeId}/bonuses?bonusId=${id}`, { method: "DELETE" });
    if (r.ok) setList((p) => p.filter((x) => x.id !== id));
  }

  const total = list.reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(217,215,200,.5)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{t("employees.bonuses.title")} {total > 0 && <span style={{ color: "var(--emerald-dark)", fontWeight: 700 }}>{t("employees.bonuses.totalPrefix", { v: formatCurrency(total) })}</span>}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div><label style={{ fontSize: 11 }}>{t("employees.bonuses.month")}</label><select value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{monthName(locale, i)}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>{t("employees.bonuses.year")}</label><input type="number" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} style={{ width: 80, padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>{t("employees.bonuses.amount")}</label><NumberField value={f.amount} onChange={(v) => setF({ ...f, amount: v })} style={{ width: 90, padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>{t("employees.bonuses.kind")}</label><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{BONUS_KEYS.map((k) => <option key={k} value={k}>{t(`employees.bonusKind.${k}`)}</option>)}</select></div>
        <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: 11 }}>{t("employees.bonuses.note")}</label><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <button className="btn btn-primary btn-sm" onClick={add}>{t("employees.bonuses.add")}</button>
      </div>
      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("employees.loading")}</div> : list.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("employees.bonuses.none")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {list.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span><strong>{monthName(locale, b.month)} {b.year}</strong> · {formatCurrency(b.amount)} · {(() => { const l = t(`employees.bonusKind.${b.kind}`); return l.startsWith("employees.") ? b.kind : l; })()}{b.note ? ` · ${b.note}` : ""}</span>
              <button onClick={() => del(b.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilesPanel({ employeeId }: { employeeId: string }) {
  const { t, locale } = useI18n();
  const [files, setFiles] = useState<EmpFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPE_KEYS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/employees/${employeeId}/files`).then(async (r) => {
      if (r.ok) setFiles(await r.json());
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [employeeId]);

  async function upload(file: File) {
    setErr("");
    if (file.size > 5 * 1024 * 1024) { setErr(t("employees.leaveForm.fileTooLarge")); return; }
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const r = await fetch(`/api/employees/${employeeId}/files`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, docType, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
      });
      if (r.ok) { const f = await r.json(); setFiles((p) => [f, ...p]); }
      else setErr((await r.json()).error ?? t("employees.files.uploadErr"));
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm(t("employees.files.confirmDelete"))) return;
    const r = await fetch(`/api/employees/${employeeId}/files?fileId=${id}`, { method: "DELETE" });
    if (r.ok) setFiles((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(217,215,200,.5)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>{t("employees.files.title")}</div>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11 }}>{t("employees.files.docType")}</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }}>
            {DOC_TYPE_KEYS.map((k) => <option key={k} value={k}>{t(`employees.files.types.${k}`)}</option>)}
          </select>
        </div>
        <label className="btn btn-primary btn-sm" style={{ cursor: busy ? "wait" : "pointer" }}>
          {busy ? t("employees.files.uploading") : t("employees.files.attachFile")}
          <input type="file" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("employees.files.maxSize")}</span>
      </div>
      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("employees.loading")}</div> : files.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("employees.files.none")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {files.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>
                {f.docType && <strong style={{ color: "var(--navy)" }}>{docTypeLabel(t, f.docType)}</strong>}
                {f.docType ? " · " : ""}
                <a href={`/api/employees/${employeeId}/files/${f.id}`} style={{ color: "var(--ink)" }}>{f.name}</a>
                <span style={{ color: "var(--muted)" }}> · {(f.size / 1024).toFixed(0)} KB · {new Date(f.uploadedAt).toLocaleDateString(locale)}</span>
              </span>
              <span style={{ display: "flex", gap: 8 }}>
                <a href={`/api/employees/${employeeId}/files/${f.id}`} className="btn btn-ghost btn-sm">↓</a>
                <button onClick={() => del(f.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
