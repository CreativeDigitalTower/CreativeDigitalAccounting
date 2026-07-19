"use client";
import { parseLocalizedNumber } from "@/lib/number";
import { NumberField } from "@/components/i18n/NumberField";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { STATUSES, STAGES, TASK_TYPES } from "@/lib/crm";
import { confirmDelete } from "@/lib/confirmDelete";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { ClientEmailsEditor, type EmailRow } from "@/components/app/ClientEmailsEditor";

// Рендерира иконата на CRM задача (ключ → SVG пиктограма)
function taskIcon(key: string | null | undefined) {
  const s = { width: 13, height: 13 };
  switch (key) {
    case "phone": return <UiIcon.phone {...s} />;
    case "mail": return <UiIcon.mail {...s} />;
    case "doc": return <UiIcon.doc {...s} />;
    case "contracts": return <NavIcon.contracts {...s} />;
    case "bell": return <UiIcon.bell {...s} />;
    case "handshake": return <UiIcon.handshake {...s} />;
    default: return <UiIcon.dot {...s} />;
  }
}

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

export function ClientCrm(props: {
  client: Client; totalInvoiced: number; paidTotal: number; documents: Doc[]; contracts: Named[]; projects: Named[];
  notes: Note[]; contacts: Contact[]; tasks: Task[]; files: FileRow[]; timeline: TimelineEvent[]; clientEmails?: EmailRow[];
}) {
  const t = useT();
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
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("clients.crm.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{client.name}</h1>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", background: status.color, borderRadius: 16, padding: "3px 11px" }}>{t(`clients.status.${status.id}`)}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/dashboard/documents/new?clientId=${client.id}&type=quote`} className="btn btn-ghost btn-sm">{t("clients.crm.newOffer")}</Link>
          <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">{t("clients.crm.newInvoice")}</Link>
        </div>
      </div>

      {/* Status + Pipeline + KPIs */}
      <div className="glass panel" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>{t("clients.crm.statusLabel")}
          <select value={client.status} onChange={(e) => saveClient({ status: e.target.value })} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{t(`clients.status.${s.id}`)}</option>)}
          </select>
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>{t("clients.crm.stageLabel")}
          <select value={client.stage} onChange={(e) => saveClient({ stage: e.target.value })} style={{ width: "auto", padding: "4px 8px", fontSize: 12.5 }}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{t(`clients.stage.${s.id}`)}</option>)}
          </select>
        </label>
        <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>{t("clients.crm.dealValueLabel")}
          <input type="text" inputMode="decimal" defaultValue={client.dealValue ?? ""} onBlur={(e) => saveClient({ dealValue: e.target.value ? parseLocalizedNumber(e.target.value) : null })} style={{ width: 110, padding: "4px 8px", fontSize: 12.5 }} />
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Kpi label={t("clients.crm.kpi.turnover")} value={formatCurrency(props.totalInvoiced + (client.openingRevenue ?? 0))} color="var(--emerald-dark)" />
          <Kpi label={t("clients.crm.kpi.invoiced")} value={formatCurrency(props.totalInvoiced)} color="var(--navy)" />
          <Kpi label={t("clients.crm.kpi.paid")} value={formatCurrency(props.paidTotal)} color="var(--emerald-dark)" />
          <Kpi label={t("clients.crm.kpi.documents")} value={String(props.documents.length)} color="var(--ink)" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["overview", "timeline", "docs", "files"] as const).map((k) => (
          <button key={k} className={`filter-tab${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{t(`clients.crm.tabs.${k}`)}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <InfoCard client={client} onSave={saveClient} />
            <EmailsCard clientId={client.id} clientName={client.name} initial={props.clientEmails ?? []} />
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
            <ListCard title={t("clients.crm.lists.contracts", { n: props.contracts.length })} items={props.contracts} empty={t("clients.crm.lists.contractsEmpty")} hrefBase="/dashboard/contracts" />
            <ListCard title={t("clients.crm.lists.projects", { n: props.projects.length })} items={props.projects} empty={t("clients.crm.lists.projectsEmpty")} hrefBase="/dashboard/projects" />
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

// Секция „Имейл адреси и получатели" — структурирано управление на няколко адреса.
function EmailsCard({ clientId, clientName, initial }: { clientId: string; clientName: string; initial: EmailRow[] }) {
  const t = useT();
  const router = useRouter();
  const [emails, setEmails] = useState<EmailRow[]>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, emails: emails.filter((e) => e.email.trim()) }),
    });
    setSaving(false);
    if (res.ok) { setMsg({ ok: true, text: t("mailattach.emails.saved") }); router.refresh(); }
    else setMsg({ ok: false, text: (await res.json()).error ?? t("mailattach.emails.errSave") });
  }

  return (
    <div>
      <ClientEmailsEditor value={emails} onChange={setEmails} defaultOpen={emails.length > 0} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: -6 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? t("mailattach.emails.saving") : t("mailattach.emails.save")}</button>
        {msg && <span style={{ fontSize: 12, color: msg.ok ? "var(--emerald-dark)" : "var(--brick)" }}>{msg.text}</span>}
      </div>
    </div>
  );
}

function InfoCard({ client, onSave }: { client: Client; onSave: (p: Partial<Client>) => void }) {
  const { t, locale } = useI18n();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(client);
  const rows: [string, keyof Client][] = [
    [t("clients.crm.f.eik"), "eik"], [t("clients.crm.f.vat"), "vatNumber"], [t("clients.crm.f.mol"), "mol"], [t("clients.crm.f.contactPerson"), "contactPerson"],
    [t("clients.crm.f.email"), "contactEmail"], [t("clients.crm.f.phone"), "phone"], [t("clients.crm.f.website"), "website"], [t("clients.crm.f.city"), "city"], [t("clients.crm.f.address"), "address"], [t("clients.crm.f.tags"), "tags"],
  ];
  return (
    <div className="glass panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>{t("clients.crm.info.title")}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (edit) {
            // Записваме само полетата от този формуляр — НЕ status/stage/dealValue,
            // за да не се презапише статус, сменен от падащото меню в друг момент.
            const { status: _s, stage: _st, dealValue: _dv, ...info } = f;
            void _s; void _st; void _dv;
            onSave(info);
          }
          setEdit(!edit);
        }}>{edit ? t("clients.crm.info.save") : t("clients.crm.info.edit")}</button>
      </div>
      {edit ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>{t("clients.crm.info.name")}</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          {rows.map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 12 }}>{l}</label><input value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          ))}
          <div><label style={{ fontSize: 12 }}>{t("clients.crm.info.birthday")}</label><input type="date" value={f.birthday?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, birthday: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>{t("clients.crm.info.clientSince")}</label><input type="date" value={f.clientSince?.slice(0, 10) ?? ""} onChange={(e) => setF({ ...f, clientSince: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>{t("clients.crm.info.openingRevenue")}</label><NumberField value={f.openingRevenue} onValueChange={(n) => setF({ ...f, openingRevenue: n ?? 0 })} placeholder={t("clients.crm.info.openingRevenuePh")} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12 }}>{t("clients.crm.info.monthlyRetainer")}</label><NumberField value={f.monthlyRetainer} onValueChange={(n) => setF({ ...f, monthlyRetainer: n })} placeholder={t("clients.crm.info.monthlyRetainerPh")} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
        </div>
      ) : (
        <dl style={{ margin: 0, fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "7px 12px" }}>
          {([[t("clients.crm.f.eik"), client.eik], [t("clients.crm.f.vat"), client.vatNumber], [t("clients.crm.f.mol"), client.mol], [t("clients.crm.f.contactPerson"), client.contactPerson], [t("clients.crm.f.email"), client.contactEmail], [t("clients.crm.f.phone"), client.phone], [t("clients.crm.f.website"), client.website], [t("clients.crm.f.city"), client.city], [t("clients.crm.f.address"), client.address], [t("clients.crm.info.clientSinceView"), client.clientSince ? new Date(client.clientSince).toLocaleDateString(locale) : null], [t("clients.crm.info.openingRevenueView"), client.openingRevenue ? formatCurrency(client.openingRevenue) : null], [t("clients.crm.info.monthlyRetainerView"), client.monthlyRetainer ? formatCurrency(client.monthlyRetainer) : null], [t("clients.crm.info.birthday"), client.birthday ? new Date(client.birthday).toLocaleDateString(locale) : null], [t("clients.crm.f.tags"), client.tags]] as [string, string | null][])
            .filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--muted)" }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd></div>
            ))}
        </dl>
      )}
    </div>
  );
}

function ContactsCard({ clientId, initial }: { clientId: string; initial: Contact[] }) {
  const t = useT();
  const [list, setList] = useState(initial);
  const [f, setF] = useState({ name: "", position: "", phone: "", email: "" });
  async function add() {
    if (!f.name.trim()) return;
    const res = await fetch(`/api/clients/${clientId}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (res.ok) { setList([...list, await res.json()]); setF({ name: "", position: "", phone: "", email: "" }); }
  }
  async function del(id: string) { if (!(await confirmDelete(t("clients.crm.contacts.confirmDelete")))) return; const r = await fetch(`/api/clients/${clientId}/contacts?contactId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((c) => c.id !== id)); }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("clients.crm.contacts.title")}</h3>
      {list.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
          <div><div style={{ fontWeight: 600 }}>{c.name} {c.position && <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {c.position}</span>}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{[c.phone, c.email].filter(Boolean).join(" · ")}</div></div>
          <button onClick={() => del(c.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
        <input placeholder={t("clients.crm.contacts.name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder={t("clients.crm.contacts.position")} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder={t("clients.crm.contacts.phone")} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <input placeholder={t("clients.crm.contacts.email")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={{ padding: "6px 8px", fontSize: 12.5 }} />
      </div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={add}>{t("clients.crm.contacts.add")}</button>
    </div>
  );
}

function TasksCard({ clientId, initial }: { clientId: string; initial: Task[] }) {
  const { t: tr, locale } = useI18n();
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
  async function del(id: string) { if (!(await confirmDelete(tr("clients.crm.tasks.confirmDelete")))) return; const r = await fetch(`/api/clients/${clientId}/tasks?taskId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((t) => t.id !== id)); }
  const tIcon = (t: string | null) => taskIcon(TASK_TYPES.find((x) => x.id === t)?.icon);
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{tr("clients.crm.tasks.title")}</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {TASK_TYPES.slice(0, 5).map((tt) => (
          <button key={tt.id} onClick={() => setType(tt.id)} className={`filter-tab${type === tt.id ? " active" : ""}`} style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}>{taskIcon(tt.icon)} {tr(`clients.taskType.${tt.id}`)}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder={tr("clients.crm.tasks.placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 140, padding: "6px 8px", fontSize: 12.5 }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{tr("clients.crm.tasks.empty")}</div> : list.map((t) => {
        const overdue = !t.done && t.dueDate && new Date(t.dueDate) < new Date();
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} style={{ width: "auto" }} />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "inherit" }}>{tIcon(t.type)} {t.title}</span>
            {t.dueDate && <span className="num" style={{ fontSize: 11.5, color: overdue ? "var(--brick)" : "var(--muted)" }}>{new Date(t.dueDate).toLocaleDateString(locale)}</span>}
            <button onClick={() => del(t.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

function NotesCard({ clientId, initial }: { clientId: string; initial: Note[] }) {
  const { t, locale } = useI18n();
  const [list, setList] = useState(initial);
  const [text, setText] = useState("");
  async function add() {
    if (!text.trim()) return;
    const res = await fetch(`/api/clients/${clientId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text }) });
    if (res.ok) { const n = await res.json(); setList([{ id: n.id ?? Math.random().toString(), note: text, createdAt: new Date().toISOString() }, ...list]); setText(""); }
  }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("clients.crm.notes.title")}</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder={t("clients.crm.notes.placeholder")} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("clients.crm.notes.empty")}</div> : list.map((n) => (
        <div key={n.id} style={{ fontSize: 13, padding: "8px 10px", background: "rgba(255,255,255,.5)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 6 }}>
          <div>{n.note}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString(locale)}</div>
        </div>
      ))}
    </div>
  );
}

function TimelineCard({ events }: { events: TimelineEvent[] }) {
  const { t, locale } = useI18n();
  const byYear = new Map<string, TimelineEvent[]>();
  for (const e of events) { const y = new Date(e.date).getFullYear().toString(); if (!byYear.has(y)) byYear.set(y, []); byYear.get(y)!.push(e); }
  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));
  return (
    <div className="glass panel" style={{ maxWidth: 720 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>{t("clients.crm.timeline.title")}</h3>
      {events.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("clients.crm.timeline.empty")}</div> : years.map((y) => (
        <div key={y} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{y}</div>
          <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: 16, marginLeft: 6 }}>
            {byYear.get(y)!.map((e, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: 14 }}>
                <span style={{ position: "absolute", left: -25, top: 0, width: 18, height: 18, borderRadius: "50%", background: e.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{e.icon}</span>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{new Date(e.date).toLocaleDateString(locale)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocsTable({ docs }: { docs: Doc[] }) {
  const { t, locale } = useI18n();
  const docType = (type: string) => {
    const label = t(`clients.docShort.${type}`);
    return label === `clients.docShort.${type}` ? type : label;
  };
  return (
    <div className="glass panel" style={{ padding: "8px 0" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>{t("clients.crm.docs.title", { n: docs.length })}</h3>
      {docs.length === 0 ? <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>{t("clients.crm.docs.empty")}</div> : (
        <table>
          <thead><tr><th style={{ paddingLeft: 16 }}>{t("clients.crm.docs.number")}</th><th>{t("clients.crm.docs.type")}</th><th>{t("clients.crm.docs.date")}</th><th className="num">{t("clients.crm.docs.amount")}</th><th>{t("clients.crm.docs.status")}</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td style={{ paddingLeft: 16 }}><Link href={`/dashboard/documents/${d.id}`} style={{ color: "var(--navy)", textDecoration: "none", fontWeight: 600 }}>{d.number}</Link></td>
                <td style={{ fontSize: 13 }}>{docType(d.type)}</td>
                <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(d.issueDate).toLocaleDateString(locale)}</td>
                <td className="num">{formatCurrency(d.total, d.currency)}</td>
                <td style={{ fontSize: 12 }}>{d.status === "paid" ? t("clients.crm.docs.paid") : d.status === "overdue" ? t("clients.crm.docs.overdue") : d.status}</td>
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
  const t = useT();
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(""); if (file.size > 5 * 1024 * 1024) { setErr(t("clients.crm.files.tooLarge")); return; }
    setBusy(true);
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    const resp = await fetch(`/api/clients/${clientId}/files`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }) });
    setBusy(false); e.target.value = "";
    if (resp.ok) { const f = await resp.json(); setList([{ id: f.id, name: f.name, size: file.size, uploadedAt: new Date().toISOString() }, ...list]); }
    else setErr((await resp.json()).error ?? t("clients.crm.files.uploadErr"));
  }
  async function del(id: string) { if (!(await confirmDelete(t("clients.crm.files.confirmDelete")))) return; const r = await fetch(`/api/clients/${clientId}/files?fileId=${id}`, { method: "DELETE" }); if (r.ok) setList(list.filter((f) => f.id !== id)); }
  const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 10px" }}>{t("clients.crm.files.title")}</h3>
      {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "6px 10px", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <input type="file" onChange={onFile} disabled={busy} style={{ fontSize: 13, marginBottom: 12 }} />
      {busy && <span style={{ fontSize: 12, color: "var(--muted)" }}> {t("clients.crm.files.uploading")}</span>}
      {list.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("clients.crm.files.empty")}</div> : list.map((f) => (
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
