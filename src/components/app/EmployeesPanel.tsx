"use client";

import { useEffect, useState, Fragment } from "react";
import { formatCurrency } from "@/lib/constants";
import { calcPayroll, sumPayroll, EMPLOYEE_SSC_RATE, EMPLOYER_SSC_RATE } from "@/lib/payroll";
import { confirmDelete } from "@/lib/confirmDelete";
import { UiIcon } from "@/components/app/NavIcons";

type Leave = { id: string; type: string; startDate: string; endDate: string; days: number | null; note: string | null; docName?: string | null };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });
}
type EmpFile = { id: string; name: string; docType: string | null; mimeType: string; size: number; uploadedAt: string };
type Employee = {
  id: string; name: string; position: string | null; phone: string | null; email: string | null;
  address: string | null; salary: number | null; hiredAt: string | null; paidLeaveDays: number; notes: string | null; active: boolean;
  leaves?: Leave[];
};

const LEAVE_LABELS: Record<string, string> = { leave: "Платен отпуск", sick: "Болничен", unpaid: "Неплатен отпуск", other: "Друго" };
const empty = { name: "", position: "", phone: "", email: "", address: "", salary: "", hiredAt: "", paidLeaveDays: "20", notes: "" };

export function EmployeesPanel({ initial }: { initial: Employee[] }) {
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
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  async function remove(id: string) {
    if (!confirm("Изтриване на служителя?")) return;
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) setEmployees((e) => e.filter((x) => x.id !== id));
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Служители</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{employees.length} служители</div>
        </div>
        <button className="btn btn-primary" onClick={startAdd}>+ Нов служител</button>
      </div>

      {(() => {
        const gross = employees.filter((e) => e.active).map((e) => e.salary ?? 0);
        const t = sumPayroll(gross);
        if (gross.length === 0 || t.gross === 0) return null;
        const cards: [string, number, string][] = [
          ["Общ разход за работодателя", t.employerCost, "var(--brick)"],
          ["Общо бруто заплати", t.gross, "var(--navy)"],
          ["Общо осигуровки", t.insurancesTotal, "var(--brass)"],
          ["Общо чисто за служителите", t.net, "var(--emerald-dark)"],
        ];
        return (
          <div className="glass panel" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>Разходи за заплати (общо)</h3>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 12px" }}>
              По ставки за 3-та категория труд: осигуровки служител {(EMPLOYEE_SSC_RATE * 100).toFixed(2)}% + работодател {(EMPLOYER_SSC_RATE * 100).toFixed(2)}%, данък 10%.
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
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{editing ? "Редакция" : "Нов служител"}</h3>
          {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 }}>
            <div><label>Име *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Позиция</label><input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><label>Телефон</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>Имейл</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label>Заплата (бруто)</label><input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
            <div><label>Дата на назначаване</label><input type="date" value={form.hiredAt} onChange={(e) => setForm({ ...form, hiredAt: e.target.value })} /></div>
            <div><label>Годишен платен отпуск (дни)</label><input type="number" min="0" value={form.paidLeaveDays} onChange={(e) => setForm({ ...form, paidLeaveDays: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Адрес</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>Бележки</label><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Запази</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--muted)" }}><UiIcon.people width={34} height={34} /></div>
            <div style={{ fontSize: 14 }}>Няма въведени служители</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>Име</th><th>Позиция</th><th>Телефон</th><th>Имейл</th><th className="num">Заплата</th><th></th></tr></thead>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(e)} title="Редактирай" style={{ display: "inline-flex", alignItems: "center" }}><UiIcon.edit /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--brick)" }} onClick={() => remove(e.id)}>Изтрий</button>
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
      if (file.size > 5 * 1024 * 1024) { setErr("Файлът е твърде голям (макс. 5 MB)."); return; }
      doc = { docName: file.name, docMimeType: file.type || "application/octet-stream", docDataUrl: await fileToDataUrl(file) };
    }
    const res = await fetch(`/api/employees/${employee.id}/leaves`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, ...doc }),
    });
    if (res.ok) { const l = await res.json(); setLeaves((p) => [l, ...p]); setForm({ type: "leave", startDate: "", endDate: "", note: "" }); setFile(null); }
    else setErr((await res.json()).error ?? "Грешка при запис.");
  }

  // Замяна/прикачване на документ към съществуващ отпуск
  async function attachDoc(leaveId: string, f: File) {
    if (f.size > 5 * 1024 * 1024) { setErr("Файлът е твърде голям (макс. 5 MB)."); return; }
    const r = await fetch(`/api/employees/${employee.id}/leaves/${leaveId}/doc`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docName: f.name, docMimeType: f.type || "application/octet-stream", docDataUrl: await fileToDataUrl(f) }),
    });
    if (r.ok) setLeaves((p) => p.map((x) => x.id === leaveId ? { ...x, docName: f.name } : x));
  }
  async function removeDoc(leaveId: string) {
    if (!(await confirmDelete("прикачения документ"))) return;
    const r = await fetch(`/api/employees/${employee.id}/leaves/${leaveId}/doc`, { method: "DELETE" });
    if (r.ok) setLeaves((p) => p.map((x) => x.id === leaveId ? { ...x, docName: null } : x));
  }
  async function del(id: string) {
    if (!(await confirmDelete("този запис за отпуск/болничен"))) return;
    const res = await fetch(`/api/employees/${employee.id}/leaves?leaveId=${id}`, { method: "DELETE" });
    if (res.ok) setLeaves((p) => p.filter((x) => x.id !== id));
  }

  const usedPaid = leaves.filter((l) => l.type === "leave").reduce((s, l) => s + (l.days ?? 0), 0);
  const usedUnpaid = leaves.filter((l) => l.type === "unpaid").reduce((s, l) => s + (l.days ?? 0), 0);
  const totalSick = leaves.filter((l) => l.type === "sick").reduce((s, l) => s + (l.days ?? 0), 0);
  const entitlement = employee.paidLeaveDays ?? 20;
  const remaining = entitlement - usedPaid;

  const pay = calcPayroll(employee.salary ?? 0);

  return (
    <div>
      {employee.address && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>Адрес: {employee.address}</div>}
      {employee.notes && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>Бележки: {employee.notes}</div>}

      {/* Разбивка на заплатата */}
      {(employee.salary ?? 0) > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Разбивка на заплатата (месечно)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10 }}>
            {([
              ["Бруто заплата", pay.gross, "var(--navy)"],
              ["Осигуровки (служител)", pay.employeeSSC, "var(--brass)"],
              ["Данък (10%)", pay.tax, "var(--brass)"],
              ["Чиста сума", pay.net, "var(--emerald-dark)"],
              ["Осигуровки (работодател)", pay.employerSSC, "var(--brass)"],
              ["Общ разход за фирмата", pay.employerCost, "var(--brick)"],
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
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Полагаем платен отпуск</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{entitlement} дни</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Използван платен</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{usedPaid} дни</div>
        </div>
        <div style={{ background: remaining < 0 ? "var(--brick-soft)" : "var(--brass-soft)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Оставащ платен</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700, color: remaining < 0 ? "var(--brick)" : "var(--brass)" }}>{remaining} дни</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.5)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Неплатен / Болничен</div>
          <div className="num" style={{ fontSize: 14, fontWeight: 700 }}>{usedUnpaid} / {totalSick} дни</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div><label style={{ fontSize: 11 }}>Вид</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }}>{Object.entries(LEAVE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label style={{ fontSize: 11 }}>От</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div><label style={{ fontSize: 11 }}>До</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 11 }}>Бележка</label><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} /></div>
        <div>
          <label style={{ fontSize: 11 }}>Документ (по избор)</label>
          <div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
              {file ? file.name.slice(0, 18) : "Прикачи…"}
              <input type="file" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); }} />
            </label>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Добави</button>
      </div>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", margin: "4px 0 6px" }}>Отпуски / болнични</div>
      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Зареждане…</div> : leaves.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма записани отпуски/болнични.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {leaves.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>
                <strong>{LEAVE_LABELS[l.type]}</strong> · {new Date(l.startDate).toLocaleDateString("bg-BG")} – {new Date(l.endDate).toLocaleDateString("bg-BG")} ({l.days} дни){l.note ? ` · ${l.note}` : ""}
                {l.docName && (
                  <a href={`/api/employees/${employee.id}/leaves/${l.id}/doc`} style={{ marginLeft: 8, color: "var(--navy)", fontWeight: 600 }}>↓ {l.docName}</a>
                )}
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <label style={{ cursor: "pointer", color: "var(--muted)", fontSize: 11.5 }} title={l.docName ? "Замени документа" : "Прикачи документ"}>
                  {l.docName ? "Замени" : "+ Документ"}
                  <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) attachDoc(l.id, f); e.target.value = ""; }} />
                </label>
                {l.docName && <button onClick={() => removeDoc(l.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11.5 }}>изтрий док.</button>}
                <button onClick={() => del(l.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DOC_TYPES = ["Трудов договор", "Допълнително споразумение", "Молба за отпуск", "Молба за напускане", "Болничен лист", "Длъжностна характеристика", "Друго"];

function FilesPanel({ employeeId }: { employeeId: string }) {
  const [files, setFiles] = useState<EmpFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
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
    if (file.size > 5 * 1024 * 1024) { setErr("Файлът е твърде голям (макс. 5 MB)."); return; }
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
      else setErr((await r.json()).error ?? "Грешка при качване.");
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("Изтриване на документа?")) return;
    const r = await fetch(`/api/employees/${employeeId}/files?fileId=${id}`, { method: "DELETE" });
    if (r.ok) setFiles((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(217,215,200,.5)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>Архив с документи</div>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11 }}>Вид документ</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className="btn btn-primary btn-sm" style={{ cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Качване…" : "+ Прикачи файл"}
          <input type="file" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>макс. 5 MB</span>
      </div>
      {!loaded ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Зареждане…</div> : files.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма прикачени документи.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {files.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
              <span>
                {f.docType && <strong style={{ color: "var(--navy)" }}>{f.docType}</strong>}
                {f.docType ? " · " : ""}
                <a href={`/api/employees/${employeeId}/files/${f.id}`} style={{ color: "var(--ink)" }}>{f.name}</a>
                <span style={{ color: "var(--muted)" }}> · {(f.size / 1024).toFixed(0)} KB · {new Date(f.uploadedAt).toLocaleDateString("bg-BG")}</span>
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
