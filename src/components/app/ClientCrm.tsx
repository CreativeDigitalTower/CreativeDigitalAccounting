"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { STATUSES, STAGES, TASK_TYPES } from "@/lib/crm";

// Реекспорт за обратна съвместимост (стари импорти от този модул).
export { STATUSES, STAGES } from "@/lib/crm";

type Client = {
  id: string; name: string; eik: string | null; vatNumber: string | null; address: string | null; city: string | null;
  mol: string | null; contactPerson: string | null; contactEmail: string | null; phone: string | null;
  status: string; stage: string; dealValue: number | null; birthday: string | null; website: string | null; tags: string | null;
  clientSince: string | null; openingRevenue: number | null; monthlyRetainer: number | null;
};
type Doc = { id: string; type: string; number: string; issueDate: string; total: number; currency: string; status: string };
type Named = { id: string; label: string; sub?: string };
type Contact = { id: string; name: string; position: string | null; phone: string | null; email: string | null };
type Task = { id: string; title: string; type: string | null; dueDate: string | null; done: boolean };
type FileRow = { id: string; name: string; size: number; uploadedAt: string };
type TimelineEvent = { date: string; kind: string; label: string; icon: string; color: string };
type Note = { id: string; note: string; createdAt: string };

const DOC_LABEL: Record<string, string> = { invoice: "Фактура", proforma: "Проформа", quote: "Оферта", credit_note: "Кр. известие", debit_note: "Деб. известие" };

export function ClientCrm(props: {
  client: Client; totalInvoiced: number; paidTotal: number; documents: Doc[]; contracts: Named[]; projects: Named[];
  notes: Note[]; contacts: Contact[]; tasks: Task[]; files: FileRow[]; timeline: TimelineEvent[];
}) {
  const router = useRouter();
  const [client, setClient] = useState(props.client);
  const [tab, setTab] = useState<"overview" | "timeline" | "docs" | "files">("overview");

  const status = STATUSES.find((s) => s.id === client.status) ?? STATUSES[1];

  async function saveClient(patch: Partial<Client>) {
    const next = { ...client, ...patch };
    setClient(next);
    await fetch(`/api/clients/${client.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: next.name, eik: next.eik, vatNumber: next.vatNumber, address: next.address, city: next.city,
        mol: next.mol, contactPerson: next.contactPerson, contactEmail: next.contactEmail, phone: next.phone,
        status: next.status, stage: next.stage, dealValue: next.dealValue, birthday: next.birthday, website: next.website, tags: next.tags,
        clientSince: next.clientSince, openingRevenue: next.openingRevenue, monthlyRetainer: next.monthlyRetainer,
      }),
    });
    router.refresh();
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Клиенти (CRM)</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{client.name}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: status.color, borderRadius: 16, padding: "3px 11px" }}>{status.label}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/dashboard/documents/new?clientId=${client.id}&type=quote`} className="btn btn-ghost btn-sm">+ Оферта</Link>
          <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">+ Фактура</Link>
        </div>
      </div>

      {/* Status + Pipeline + KPIs */}
      <div className="glass panel" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>Статус:
          <select value={client.status} onChange={(e) => saveClient({ status: e.target.value })} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>Етап (pipeline):
          <select value={client.stage} onChange={(e) => saveClient({ stage: e.target.value })} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>Стойност на сделка (€):
          <input type="number" defaultValue={client.dealValue ?? ""} onBlur={(e) => saveClient({ dealValue: e.target.value ? Number(e.target.value) : null })} style={{ width: 110, padding: "4px 8px", fontSize: 12.5 }} />
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Kpi label="Оборот от клиента" value={formatCurrency(props.totalInvoiced + (client.openingRevenue ?? 0))} color="var(--emerald-dark)" />
          <Kpi label="Фактурирано (в системата)" value={formatCurrency(props.totalInvoiced)} color="var(--navy)" />
          <Kpi label="Платено" value={formatCurrency(props.paidTotal)} color="var(--emerald-dark)" />
          <Kpi label="Документи" value={String(props.documents.length)} color="var(--ink)" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {([["overview", "Преглед"], ["timeline", "Хронология"], ["docs", "Документи и проекти"], ["files", "Файлове"]] as const).map(([k, l]) => (
          <button key={k} className={`filter-tab${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <InfoCard client={client} onSave={saveClient} />
            <ContactsCard clientId={client.id} initial={props.contacts} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TasksCard clientId={client.id} initial={props.tasks} />
            <NotesCard clientId={client.id} initial={props.notes} />
          </div>
        </div>
      )}

      {tab === "timeline" && <TimelineCard events={props.timeline} />}

      {tab === "docs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DocsTable docs={props.documents} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ListCard title={`Договори (${props.contracts.length})`} items={props.contracts} empty="Няма договори." hrefBase="/dashboard/contracts" />
            <ListCard title={`Проекти (${props.projects.length})`} items={props.projects} empty="Няма проекти." hrefBase="/dashboard/projects" />
          </div>
        </div>
      )}

      {tab === "files" && <FilesCard clientId={client.id} initial={props.files} />}
    </>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div></div>;
}

function InfoCard({ client, onSave }: { client: Client; onSave: (p: Partial<Client>) => void }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(client);
  const rows: [string, keyof Client][] = [
    ["ЕИК", "eik"], ["ДДС №", "vatNumber"], ["МОЛ", "mol"], ["Контактно лице", "contactPerson"],
    ["Имейл", "contactEmail"], ["Телефон", "phone"], ["Уебсайт", "website"], ["Град", "city"], ["Адрес", "address"], ["Тагове", "tags"],
  ];
  return (
    <div className="glass panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Данни за клиента</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => { if (edit) onSave(f); setEdit(!edit); }}>{edit ? "Запази" : "✎ Редактирай"}</button>
      </div>
      {edit ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Наименование</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          {rows.map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 12 }}>{l}</label><input value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          ))}
          <div><label style={{ fontSize: 12 }}>Рожден ден</label><input type="date" value={f.birthday?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, birthday: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>Клиент от (дата)</label><input type="date" value={f.clientSince?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, clientSince: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>Пренесен оборот (€)</label><input type="number" value={f.openingRevenue ?? ""} onChange={(e) => setF({ ...f, openingRevenue: e.target.value ? Number(e.target.value) : 0 })} placeholder="оборот преди системата" style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>Месечен абонамент (€)</label><input type="number" value={f.monthlyRetainer ?? ""} onChange={(e) => setF({ ...f, monthlyRetainer: e.target.value ? Number(e.target.value) : null })} placeholder="по избор" style={{ padding: "6px 9px", fontSize: 13 }} /></div>
        </div>
      ) : (
        <dl style={{ margin: 0, fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 12px" }}>
          {([["ЕИК", client.eik], ["ДДС №", client.vatNumber], ["МОЛ", client.mol], ["Контактно лице", client.contactPerson], ["Имейл", client.contactEmail], ["Телефон", client.phone], ["Уебсайт", client.website], ["Град", client.city], ["Адрес", client.address], ["Клиент от", client.clientSince ? new Date(client.clientSince).toLocaleDateString("bg-BG") : null], ["Пренесен оборот", client.openingRevenue ? formatCurrency(client.openingRevenue) : null], ["Месечен абонамент", client.monthlyRetainer ? formatCurrency(client.monthlyRetainer) : null], ["Рожден ден", client.birthday ? new Date(client.birthday).toLocaleDateString("bg-BG") : null], ["Тагове", client.tags]] as [string, string | null][])
            .filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd></div>
            ))}
        </dl>
      )}
    </div>
  );
}

function ContactsCard({ clientId, initial }: { clientId: string; initial: Contact[] }) {
  const [list, setList] = useState(initial);
  const [f, setF] = useState({ name: "", position: "", phone: "", email: "" });
  async function add() {
    if (!f.name.trim()) return;
    const res = await fetch(`/api/clients/${clientId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) { setList([...list, await res.json()]); setF({ name: "", position: "", phone: "", email: "" }); }
  }
  async function del(id: string) { const r = await fetch(`/api/clients/${clientId}/contacts?contactId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((c) => c.id !== id)); }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Контактни лица</h3>
      {list.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
          <div><div style={{ fontWeight: 600 }}>{c.name} {c.position && <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {c.position}</span>}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{[c.phone, c.email].filter(Boolean).join(" · ")}</div></div>
          <button onClick={() => del(c.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
        <input placeholder="Име" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder="Длъжност" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder="Телефон" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder="Имейл" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
      </div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Добави контакт</button>
    </div>
  );
}

function TasksCard({ clientId, initial }: { clientId: string; initial: Task[] }) {
  const [list, setList] = useState(initial);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [due, setDue] = useState("");
  async function add() {
    if (!title.trim()) return;
    const res = await fetch(`/api/clients/${clientId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, type, dueDate: due || null }) });
    if (res.ok) { setList([await res.json(), ...list]); setTitle(""); setDue(""); }
  }
  async function toggle(t: Task) { await fetch(`/api/clients/${clientId}/tasks`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: t.id, done: !t.done }) }); setList(list.map((x) => x.id === t.id ? { ...x, done: !x.done } : x)); }
  async function del(id: string) { const r = await fetch(`/api/clients/${clientId}/tasks?taskId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((t) => t.id !== id)); }
  const tIcon = (t: string | null) => TASK_TYPES.find((x) => x.id === t)?.icon ?? "•";
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>CRM задачи</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {TASK_TYPES.slice(0, 5).map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} className={`filter-tab${type === t.id ? " active" : ""}`} style={{ fontSize: 11 }}>{t.icon} {t.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder="Задача…" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 140, padding: "6px 8px", fontSize: 12.5 }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма задачи.</div> : list.map((t) => {
        const overdue = !t.done && t.dueDate && new Date(t.dueDate) < new Date();
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} style={{ width: "auto" }} />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "inherit" }}>{tIcon(t.type)} {t.title}</span>
            {t.dueDate && <span className="num" style={{ fontSize: 11.5, color: overdue ? "var(--brick)" : "var(--muted)" }}>{new Date(t.dueDate).toLocaleDateString("bg-BG")}</span>}
            <button onClick={() => del(t.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function NotesCard({ clientId, initial }: { clientId: string; initial: Note[] }) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  async function add() {
    if (!text.trim()) return;
    const res = await fetch(`/api/clients/${clientId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text }) });
    if (res.ok) { const n = await res.json(); setList([{ id: n.id ?? Math.random().toString(), note: text, createdAt: new Date().toISOString() }, ...list]); setText(""); }
  }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>CRM бележки</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Добави бележка…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма бележки.</div> : list.map((n) => (
        <div key={n.id} style={{ fontSize: 13, padding: "8px 10px", background: "rgba(255,255,255,.5)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 6 }}>
          <div>{n.note}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString("bg-BG")}</div>
        </div>
      ))}
    </div>
  );
}

function TimelineCard({ events }: { events: TimelineEvent[] }) {
  const byYear = new Map<string, TimelineEvent[]>();
  for (const e of events) { const y = new Date(e.date).getFullYear().toString(); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y)!.push(e); }
  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));
  return (
    <div className="glass panel" style={{ maxWidth: 720 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Хронология на клиента</h3>
      {events.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>Все още няма събития.</div> : years.map((y) => (
        <div key={y} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{y}</div>
          <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 16, marginLeft: 6 }}>
            {byYear.get(y)!.map((e, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 14 }}>
                <span style={{ position: "absolute", left: -25, top: 0, width: 18, height: 18, borderRadius: "50%", background: e.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{e.icon}</span>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{new Date(e.date).toLocaleDateString("bg-BG")}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocsTable({ docs }: { docs: Doc[] }) {
  return (
    <div className="glass panel" style={{ padding: "8px 0" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>Документи ({docs.length})</h3>
      {docs.length === 0 ? <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>Няма документи.</div> : (
        <table>
          <thead><tr><th style={{ paddingLeft: 16 }}>Номер</th><th>Тип</th><th>Дата</th><th className="num">Сума</th><th>Статус</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td style={{ paddingLeft: 16 }}><Link href={`/dashboard/documents/${d.id}`} style={{ color: "var(--navy)", textDecoration: "none", fontWeight: 600 }}>{d.number}</Link></td>
                <td style={{ fontSize: 13 }}>{DOC_LABEL[d.type] ?? d.type}</td>
                <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(d.issueDate).toLocaleDateString("bg-BG")}</td>
                <td className="num">{formatCurrency(d.total, d.currency)}</td>
                <td style={{ fontSize: 12 }}>{d.status === "paid" ? "Платена" : d.status === "overdue" ? "Просрочена" : d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ListCard({ title, items, empty, hrefBase }: { title: string; items: Named[]; empty: string; hrefBase: string }) {
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 10px" }}>{title}</h3>
      {items.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{empty}</div> : items.map((it) => (
        <Link key={it.id} href={`${hrefBase}/${it.id}`} style={{ display: "block", fontSize: 13, padding: "5px 0", textDecoration: "none", color: "inherit", borderBottom: "1px solid rgba(217,215,200,.4)" }}>
          {it.label}{it.sub && <span style={{ color: "var(--muted)", fontSize: 12 }}> · {it.sub}</span>}
        </Link>
      ))}
    </div>
  );
}

function FilesCard({ clientId, initial }: { clientId: string; initial: FileRow[] }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(""); if (file.size > 5 * 1024 * 1024) { setErr("Файлът е твърде голям (макс. 5 MB)."); return; }
    setBusy(true);
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    const resp = await fetch(`/api/clients/${clientId}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }) });
    setBusy(false); e.target.value = "";
    if (resp.ok) { const f = await resp.json(); setList([{ id: f.id, name: f.name, size: file.size, uploadedAt: new Date().toISOString() }, ...list]); }
    else setErr((await resp.json()).error ?? "Грешка при качване.");
  }
  async function del(id: string) { const r = await fetch(`/api/clients/${clientId}/files?fileId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((f) => f.id !== id)); }
  const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>Файлове на клиента</h3>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <input type="file" onChange={onFile} disabled={busy} style={{ fontSize: 13, marginBottom: 12 }} />
      {busy && <span style={{ fontSize: 12, color: "var(--muted)" }}> Качване…</span>}
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма качени файлове.</div> : list.map((f) => (
        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>{f.name} <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 11.5 }}>· {fmt(f.size)}</span></span>
          <span style={{ display: "flex", gap: 8 }}>
            <a href={`/api/clients/${clientId}/files/${f.id}`} className="btn btn-ghost btn-sm" download>↓</a>
            <button onClick={() => del(f.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
          </span>
        </div>
      ))}
    </div>
  );
}
