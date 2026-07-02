"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { confirmDelete } from "@/lib/confirmDelete";

const STATUS: Record<string, string> = { active: "Активен", completed: "Завършен", on_hold: "Пауза", cancelled: "Анулиран" };

type Project = {
  id: string; name: string; description: string | null; status: string; progressPercent: number;
  budget: number | null; deadline: string | null; clientName: string | null;
  parent: { id: string; name: string } | null; revenue: number; expense: number;
};
type Entry = { id: string; type: string; amount: number; description: string | null; date: string };
type Note = { id: string; note: string; author: string | null; createdAt: string };
type Sub = { id: string; name: string; status: string; progressPercent: number; revenue: number; expense: number };

export function ProjectDetail({ project, entries: initEntries, notes: initNotes, subProjects }: {
  project: Project; entries: Entry[]; notes: Note[]; subProjects: Sub[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [p, setP] = useState(project);
  const [entries, setEntries] = useState(initEntries);
  const [notes, setNotes] = useState(initNotes);

  const profit = p.revenue - p.expense;

  async function saveProject(patch: Partial<Project>) {
    const next = { ...p, ...patch };
    setP(next);
    await fetch(`/api/projects/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next.name, description: next.description, status: next.status, progressPercent: next.progressPercent, budget: next.budget, deadline: next.deadline }),
    });
    router.refresh();
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <Link href="/dashboard/projects" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Проекти</Link>
        {p.parent && <Link href={`/dashboard/projects/${p.parent.id}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 12.5 }}>↑ {p.parent.name}</Link>}
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{p.name}</h1>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 20, padding: "3px 10px" }}>{STATUS[p.status]}</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEdit(!edit)}>{edit ? "Затвори" : "✎ Редактирай"}</button>
      </div>

      {/* Редакция */}
      {edit && (
        <div className="glass panel" style={{ padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Име</label><input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} onBlur={() => saveProject({})} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Описание</label><textarea rows={3} value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} onBlur={() => saveProject({})} style={{ width: "100%" }} /></div>
          <div><label style={{ fontSize: 12 }}>Статус</label><select value={p.status} onChange={(e) => saveProject({ status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label style={{ fontSize: 12 }}>Бюджет (€)</label><input type="number" value={p.budget ?? ""} onChange={(e) => setP({ ...p, budget: e.target.value ? Number(e.target.value) : null })} onBlur={() => saveProject({})} /></div>
          <div><label style={{ fontSize: 12 }}>Краен срок</label><input type="date" value={p.deadline?.slice(0, 10) ?? ""} onChange={(e) => saveProject({ deadline: e.target.value || null })} /></div>
        </div>
      )}

      {p.description && !edit && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 16px", whiteSpace: "pre-wrap" }}>{p.description}</p>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginBottom: 16 }}>
        {[
          { l: "Клиент", v: p.clientName ?? "—" },
          { l: "Бюджет", v: p.budget != null ? formatCurrency(p.budget) : "—" },
          { l: "Приходи", v: formatCurrency(p.revenue), c: "var(--emerald-dark)" },
          { l: "Разходи", v: formatCurrency(p.expense), c: "var(--brick)" },
          { l: "Печалба", v: formatCurrency(profit), c: profit >= 0 ? "var(--emerald-dark)" : "var(--brick)" },
          { l: "Срок", v: p.deadline ? new Date(p.deadline).toLocaleDateString("bg-BG") : "—" },
        ].map((k) => (
          <div key={k.l} className="glass kpi-card">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{k.l}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 700, color: k.c ?? "var(--ink)" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Прогрес (редактируем) */}
      <div className="glass panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Прогрес: {p.progressPercent}%</h3>
        </div>
        <input type="range" min={0} max={100} step={5} value={p.progressPercent}
          onChange={(e) => setP({ ...p, progressPercent: Number(e.target.value) })}
          onMouseUp={() => saveProject({})} onTouchEnd={() => saveProject({})}
          style={{ width: "100%" }} />
        <div style={{ height: 8, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${p.progressPercent}%`, background: "var(--emerald)", borderRadius: 4, transition: "width .2s" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <EntriesCard projectId={p.id} entries={entries} setEntries={setEntries} onChange={() => router.refresh()} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SubProjectsCard projectId={p.id} subs={subProjects} />
          <NotesCard projectId={p.id} notes={notes} setNotes={setNotes} />
        </div>
      </div>
    </>
  );
}

function EntriesCard({ projectId, entries, setEntries, onChange }: { projectId: string; entries: Entry[]; setEntries: (e: Entry[]) => void; onChange: () => void }) {
  const [type, setType] = useState<"revenue" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  async function add() {
    const a = Number(amount);
    if (!a || a <= 0) return;
    const res = await fetch(`/api/projects/${projectId}/entries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: a, description: desc || null }),
    });
    if (res.ok) { const e = await res.json(); setEntries([{ id: e.id, type, amount: a, description: desc || null, date: new Date().toISOString() }, ...entries]); setAmount(""); setDesc(""); onChange(); }
  }
  async function del(id: string) {
    if (!(await confirmDelete("това движение"))) return;
    const r = await fetch(`/api/projects/${projectId}/entries?entryId=${id}`, { method: "DELETE" });
    if (r.ok) { setEntries(entries.filter((e) => e.id !== id)); onChange(); }
  }

  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Приходи и разходи</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <button className={`filter-tab${type === "expense" ? " active" : ""}`} onClick={() => setType("expense")}>− Разход</button>
        <button className={`filter-tab${type === "revenue" ? " active" : ""}`} onClick={() => setType("revenue")}>+ Приход</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <input placeholder="Описание" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ flex: 2, minWidth: 120, padding: "6px 8px", fontSize: 12.5 }} />
        <input type="number" placeholder="Сума €" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: 1, minWidth: 80, padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {entries.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма записи.</div> : entries.map((e) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 }}>
          <span style={{ flex: 1 }}>{e.description || (e.type === "revenue" ? "Приход" : "Разход")}<span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>{new Date(e.date).toLocaleDateString("bg-BG")}</span></span>
          <span className="num" style={{ fontWeight: 700, color: e.type === "revenue" ? "var(--emerald-dark)" : "var(--brick)" }}>{e.type === "revenue" ? "+" : "−"}{formatCurrency(e.amount)}</span>
          <button onClick={() => del(e.id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
        </div>
      ))}
    </div>
  );
}

function SubProjectsCard({ projectId, subs }: { projectId: string; subs: Sub[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  async function add() {
    if (!name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentProjectId: projectId }),
    });
    if (res.ok) { setName(""); router.refresh(); }
  }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Подпроекти ({subs.length})</h3>
      {subs.map((s) => (
        <Link key={s.id} href={`/dashboard/projects/${s.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 6, borderRadius: 8, background: "rgba(255,255,255,.5)", border: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{STATUS[s.status]} · {s.progressPercent}% · печалба {formatCurrency(s.revenue - s.expense)}</div>
          </div>
          <span style={{ fontSize: 16, color: "var(--muted)" }}>›</span>
        </Link>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input placeholder="Име на подпроект…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-ghost btn-sm" onClick={add}>+ Добави</button>
      </div>
    </div>
  );
}

function NotesCard({ projectId, notes, setNotes }: { projectId: string; notes: Note[]; setNotes: (n: Note[]) => void }) {
  const [text, setText] = useState("");
  async function add() {
    if (!text.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: text }) });
    if (res.ok) { const n = await res.json(); setNotes([{ id: n.id, note: text, author: null, createdAt: new Date().toISOString() }, ...notes]); setText(""); }
  }
  async function del(id: string) {
    if (!(await confirmDelete("тази бележка"))) return;
    const r = await fetch(`/api/projects/${projectId}/notes?noteId=${id}`, { method: "DELETE" });
    if (r.ok) setNotes(notes.filter((n) => n.id !== id));
  }
  return (
    <div className="glass panel">
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 12px" }}>Бележки и коментари</h3>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input placeholder="Добави бележка…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1, padding: "6px 8px", fontSize: 12.5 }} />
        <button className="btn btn-primary btn-sm" onClick={add}>+</button>
      </div>
      {notes.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма бележки.</div> : notes.map((n) => (
        <div key={n.id} style={{ fontSize: 13, padding: "8px 10px", background: "rgba(255,255,255,.5)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 6, position: "relative" }}>
          <div>{n.note}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString("bg-BG")}</div>
          <button onClick={() => del(n.id)} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
        </div>
      ))}
    </div>
  );
}
