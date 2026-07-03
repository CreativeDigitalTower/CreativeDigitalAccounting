"use client";

import { useEffect, useState, useCallback } from "react";
import { PM_STATUSES, PM_PRIORITIES, pmStatus, pmPriority, PM_LINK_FIELDS, parseBoardLinks, parseTaskLinks, type TaskLink } from "@/lib/pm";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

type Task = {
  id: string; boardId: string; title: string; notes: string | null; priority: string; status: string;
  progress: number; assigneeId: string | null; dueDate: string | null; links: string | null; monthly: boolean;
};
type Board = { id: string; name: string; clientId: string | null; importantNotes: string | null; links: string | null; color: string | null; tasks: Task[] };
type Member = { userId: string; name: string; role: string };

const COLORS = ["#0F8A6A", "#2C4A66", "#A5812E", "#7A5CB0", "#A23B2B", "#0B5E4A", "#C9A227"];

export function ProjectManagement({ canManage }: { canManage: boolean }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"regular" | "monthly">("regular");
  const [newBoard, setNewBoard] = useState("");
  const [taskModal, setTaskModal] = useState<{ boardId: string; task?: Task } | null>(null);
  const [infoBoard, setInfoBoard] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/pm/boards");
    if (r.ok) { const d = await r.json(); setBoards(d.boards); setMembers(d.members); }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addBoard() {
    if (!newBoard.trim()) return;
    const r = await fetch("/api/pm/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBoard.trim(), color: COLORS[boards.length % COLORS.length] }) });
    if (r.ok) { setNewBoard(""); load(); }
  }
  async function delBoard(b: Board) {
    if (!(await confirmDelete(`таблото „${b.name}" и всичките му задачи`))) return;
    const r = await fetch(`/api/pm/boards/${b.id}`, { method: "DELETE" });
    if (r.ok) load();
  }
  async function patchTask(id: string, body: Record<string, unknown>) {
    await fetch(`/api/pm/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function delTask(t: Task) {
    if (!(await confirmDelete("тази задача"))) return;
    const r = await fetch(`/api/pm/tasks/${t.id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  const memberName = (id: string | null) => members.find((m) => m.userId === id)?.name ?? null;

  if (!loaded) return <div style={{ color: "var(--muted)", fontSize: 13 }}>Зареждане…</div>;

  return (
    <div>
      {/* Табове */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`filter-tab${tab === "regular" ? " active" : ""}`} onClick={() => setTab("regular")}>Задачи</button>
        <button className={`filter-tab${tab === "monthly" ? " active" : ""}`} onClick={() => setTab("monthly")}>Ежемесечни задачи</button>
        {canManage && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input value={newBoard} onChange={(e) => setNewBoard(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBoard()} placeholder="Име на фирма/колона…" style={{ padding: "7px 10px", fontSize: 13, minWidth: 180 }} />
            <button className="btn btn-primary btn-sm" onClick={addBoard}>+ Ново табло</button>
          </div>
        )}
      </div>

      {boards.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "44px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>Още няма създадени табла (фирми).</div>
          {canManage && <div style={{ fontSize: 12.5 }}>Създайте първото си табло горе вдясно — всяка фирма е отделна колона.</div>}
        </div>
      ) : (
        <div className="pm-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
          {boards.map((b) => {
            const accent = b.color ?? "var(--emerald)";
            const tasks = b.tasks.filter((t) => t.monthly === (tab === "monthly"));
            const links = parseBoardLinks(b.links);
            const linkEntries = PM_LINK_FIELDS.filter((f) => links[f.key]);
            return (
              <div key={b.id} className="glass pm-col" style={{ minWidth: 300, maxWidth: 320, flexShrink: 0, borderRadius: 14, padding: "12px 12px 14px", borderTop: `3px solid ${accent}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{b.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: "rgba(0,0,0,.04)", borderRadius: 10, padding: "1px 8px" }}>{tasks.length}</span>
                  <button onClick={() => setInfoBoard(infoBoard === b.id ? null : b.id)} title="Информация за фирмата" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>
                  </button>
                  {canManage && <button onClick={() => delBoard(b)} title="Изтрий таблото" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", display: "inline-flex" }}><UiIcon.trash width={14} height={14} /></button>}
                </div>

                {infoBoard === b.id && <BoardInfo board={b} links={links} linkEntries={linkEntries} canManage={canManage} onSaved={load} />}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} assignee={memberName(t.assigneeId)} onStatus={(s) => patchTask(t.id, { status: s })} onProgress={(p) => patchTask(t.id, { progress: p })} onEdit={() => setTaskModal({ boardId: b.id, task: t })} onDelete={() => delTask(t)} />
                  ))}
                </div>

                <button onClick={() => setTaskModal({ boardId: b.id })} className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>+ Задача</button>
              </div>
            );
          })}
        </div>
      )}

      {taskModal && (
        <TaskModal boardId={taskModal.boardId} task={taskModal.task} members={members} monthly={tab === "monthly"} onClose={() => setTaskModal(null)} onSaved={() => { setTaskModal(null); load(); }} />
      )}
    </div>
  );
}

function TaskCard({ task, assignee, onStatus, onProgress, onEdit, onDelete }: {
  task: Task; assignee: string | null; onStatus: (s: string) => void; onProgress: (p: number) => void; onEdit: () => void; onDelete: () => void;
}) {
  const st = pmStatus(task.status);
  const pr = pmPriority(task.priority);
  const links = parseTaskLinks(task.links);
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
  const dueColor = daysLeft == null ? "var(--muted)" : task.status === "done" ? "var(--muted)" : daysLeft < 0 ? "var(--brick)" : daysLeft <= 3 ? "var(--brick)" : daysLeft <= 7 ? "var(--brass)" : "var(--emerald-dark)";

  return (
    <div style={{ background: "rgba(255,255,255,.72)", borderRadius: 10, padding: "10px 11px", borderLeft: `3px solid ${pr.color}`, boxShadow: "0 1px 4px rgba(20,30,25,.05)" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{task.title}</span>
        <button onClick={onEdit} title="Редактирай" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}><UiIcon.edit width={13} height={13} /></button>
        <button onClick={onDelete} title="Изтрий" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", display: "inline-flex" }}>×</button>
      </div>
      {task.notes && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, whiteSpace: "pre-wrap" }}>{task.notes}</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: "rgba(0,0,0,.04)", borderRadius: 8, padding: "1px 7px" }}>{pr.label}</span>
        {assignee && <span style={{ fontSize: 10.5, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "1px 7px" }}>{assignee}</span>}
        {due && <span style={{ fontSize: 10.5, fontWeight: 600, color: dueColor }}>{due.toLocaleDateString("bg-BG")}{daysLeft != null && task.status !== "done" ? ` (${daysLeft < 0 ? `просрочено ${-daysLeft}д` : `${daysLeft}д`})` : ""}</span>}
      </div>

      {task.progress > 0 && task.status !== "done" && (
        <div style={{ height: 4, background: "rgba(217,215,200,.6)", borderRadius: 2, marginTop: 7 }}><div style={{ height: "100%", width: `${task.progress}%`, background: "var(--emerald)", borderRadius: 2 }} /></div>
      )}

      {links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "var(--emerald-dark)", fontWeight: 600 }}>{l.label || "файл"} ↗</a>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
        <select value={task.status} onChange={(e) => onStatus(e.target.value)} style={{ flex: 1, padding: "4px 6px", fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: "none", color: "#fff", background: st.color, cursor: "pointer" }}>
          {PM_STATUSES.map((s) => <option key={s.id} value={s.id} style={{ color: "#16201C" }}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function BoardInfo({ board, links, linkEntries, canManage, onSaved }: {
  board: Board; links: Record<string, string>; linkEntries: { key: string; label: string }[]; canManage: boolean; onSaved: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState(board.importantNotes ?? "");
  const [lnk, setLnk] = useState<Record<string, string>>({ ...links });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(lnk)) if (v && v.trim()) cleaned[k] = v.trim();
    await fetch(`/api/pm/boards/${board.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importantNotes: notes || null, links: cleaned }) });
    setBusy(false); setEdit(false); onSaved();
  }

  return (
    <div style={{ background: "rgba(0,0,0,.03)", borderRadius: 8, padding: "10px 11px", marginBottom: 4, fontSize: 12 }}>
      {edit ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Важни изисквания</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ fontSize: 12, padding: "6px 8px" }} placeholder="Опишете важните изисквания за фирмата…" />
          </div>
          {PM_LINK_FIELDS.map((f) => (
            <div key={f.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, width: 80, color: "var(--muted)" }}>{f.label}</span>
              <input value={lnk[f.key] ?? ""} onChange={(e) => setLnk({ ...lnk, [f.key]: e.target.value })} placeholder="https://…" style={{ fontSize: 11.5, padding: "5px 7px" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)} disabled={busy}>Отказ</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "…" : "Запази"}</button>
          </div>
        </div>
      ) : (
        <>
          {board.importantNotes ? (
            <div style={{ marginBottom: linkEntries.length ? 8 : 0 }}><strong style={{ color: "var(--brick)" }}>Важно:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{board.importantNotes}</span></div>
          ) : !linkEntries.length && !canManage ? <div style={{ color: "var(--muted)" }}>Няма допълнителна информация.</div> : null}
          {linkEntries.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {linkEntries.map((f) => <a key={f.key} href={links[f.key]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--emerald-dark)", fontWeight: 600 }}>{f.label} ↗</a>)}
            </div>
          )}
          {canManage && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setEdit(true)}>Редактирай информацията</button>}
        </>
      )}
    </div>
  );
}

function TaskModal({ boardId, task, members, monthly, onClose, onSaved }: {
  boardId: string; task?: Task; members: Member[]; monthly: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    title: task?.title ?? "", notes: task?.notes ?? "", priority: task?.priority ?? "normal",
    status: task?.status ?? "pending", progress: task?.progress ?? 0, assigneeId: task?.assigneeId ?? "",
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
  });
  const [links, setLinks] = useState<TaskLink[]>(task ? parseTaskLinks(task.links) : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!f.title.trim()) { setErr("Въведете заглавие."); return; }
    setBusy(true); setErr("");
    const body = {
      ...f, assigneeId: f.assigneeId || null, dueDate: f.dueDate || null,
      progress: Number(f.progress), links: links.filter((l) => l.url.trim()),
      ...(task ? {} : { boardId, monthly }),
    };
    const res = await fetch(task ? `/api/pm/tasks/${task.id}` : "/api/pm/tasks", {
      method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setErr((await res.json().catch(() => ({}))).error ?? "Грешка при запис.");
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: 22 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>{task ? "Редакция на задача" : (monthly ? "Нова ежемесечна задача" : "Нова задача")}</h3>
        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label>Заглавие *</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label>Приоритет</label><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{PM_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
          <div><label>Статус</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{PM_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          <div><label>Изпълнител</label><select value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}><option value="">— Без —</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select></div>
          <div><label>Срок за изпълнение</label><input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Изпълнение: {f.progress}%</label><input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => setF({ ...f, progress: Number(e.target.value) })} style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>Бележки</label><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>Линкове към файлове<button className="btn btn-ghost btn-sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>+ Линк</button></label>
          {links.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={l.label} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Име" style={{ flex: 1, fontSize: 12.5, padding: "6px 8px" }} />
              <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" style={{ flex: 2, fontSize: 12.5, padding: "6px 8px" }} />
              <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>Отказ</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "Записване…" : "Запази"}</button>
        </div>
      </div>
    </div>
  );
}
