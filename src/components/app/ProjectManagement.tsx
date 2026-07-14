"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PM_STATUSES, PM_PRIORITIES, pmStatus, pmPriority, PM_LINK_FIELDS,
  parseBoardLinks, parseTaskLinks, periodKey, periodLabel, prevPeriod, shiftPeriod, type TaskLink,
} from "@/lib/pm";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";
import { useI18n } from "@/components/i18n/I18nProvider";

const monthLabel = (locale: string, key: string) => { const [y, m] = key.split("-").map(Number); return new Date(y, (m || 1) - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" }); };

type Task = {
  id: string; boardId: string; title: string; description: string | null; notes: string | null;
  priority: string; status: string; progress: number; assigneeId: string | null; assigneeName: string | null;
  dueDate: string | null; links: string | null; monthly: boolean; period: string | null;
  archived: boolean; archivedAt: string | null;
};
type Board = { id: string; name: string; clientId: string | null; importantNotes: string | null; links: string | null; color: string | null; tasks: Task[] };
type Member = { userId: string; name: string; role: string };

const COLORS = ["#0F8A6A", "#2C4A66", "#A5812E", "#7A5CB0", "#A23B2B", "#0B5E4A", "#C9A227"];

export function ProjectManagement({ canManage }: { canManage: boolean }) {
  const { t, locale } = useI18n();
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"regular" | "monthly" | "archive">("regular");
  const [month, setMonth] = useState(() => periodKey(new Date()));
  const [newBoard, setNewBoard] = useState("");
  const [taskModal, setTaskModal] = useState<{ boardId: string; task?: Task } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const newBoardRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/pm/boards");
    if (r.ok) { const d = await r.json(); setBoards(d.boards); setMembers(d.members); }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addBoard() {
    if (saving) return;
    if (!newBoard.trim()) { newBoardRef.current?.focus(); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/pm/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newBoard.trim(), color: COLORS[boards.length % COLORS.length] }) });
      if (r.ok) { setNewBoard(""); await load(); }
      else setError((await r.json().catch(() => ({}))).error ?? t("pm.errCreate", { status: r.status }));
    } catch { setError(t("pm.errNet")); } finally { setSaving(false); }
  }
  async function renameBoard(b: Board, name: string) {
    if (!name.trim() || name.trim() === b.name) return;
    await fetch(`/api/pm/boards/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    load();
  }
  async function delBoard(b: Board) {
    if (!(await confirmDelete(t("pm.confirmDelBoard", { name: b.name })))) return;
    const r = await fetch(`/api/pm/boards/${b.id}`, { method: "DELETE" });
    if (r.ok) load();
  }
  async function patchTask(id: string, body: Record<string, unknown>) {
    await fetch(`/api/pm/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function delTask(task: Task) {
    if (!(await confirmDelete(t("pm.confirmDelTask")))) return;
    const r = await fetch(`/api/pm/tasks/${task.id}`, { method: "DELETE" });
    if (r.ok) load();
  }
  // Копира ежемесечните задачи от предходния месец в текущия (с нулиран статус)
  async function copyPrevMonth() {
    if (saving) return;
    const from = prevPeriod(month);
    const toCopy: { boardId: string; t: Task }[] = [];
    for (const b of boards) for (const t of b.tasks) if (t.monthly && t.period === from) toCopy.push({ boardId: b.id, t });
    if (!toCopy.length) { setError(t("pm.noMonthly", { month: monthLabel(locale, from) })); return; }
    setSaving(true); setError("");
    try {
      for (const { boardId, t } of toCopy) {
        await fetch("/api/pm/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardId, title: t.title, description: t.description, notes: t.notes, priority: t.priority,
            status: "pending", progress: 0, assigneeId: t.assigneeId, assigneeName: t.assigneeName,
            links: parseTaskLinks(t.links), monthly: true, period: month,
          }),
        });
      }
      await load();
    } finally { setSaving(false); }
  }

  const memberName = (id: string | null) => members.find((m) => m.userId === id)?.name ?? null;
  const assigneeLabel = (t: Task) => t.assigneeName || memberName(t.assigneeId);

  if (!loaded) return <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("pm.loading")}</div>;

  return (
    <div>
      {/* Табове */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`filter-tab${tab === "regular" ? " active" : ""}`} onClick={() => setTab("regular")}>{t("pm.tabs.regular")}</button>
        <button className={`filter-tab${tab === "monthly" ? " active" : ""}`} onClick={() => setTab("monthly")}>{t("pm.tabs.monthly")}</button>
        <button className={`filter-tab${tab === "archive" ? " active" : ""}`} onClick={() => setTab("archive")}>{t("pm.tabs.archive")}</button>
        {canManage && tab !== "archive" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input ref={newBoardRef} value={newBoard} onChange={(e) => setNewBoard(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBoard()} placeholder={t("pm.newBoardPh")} style={{ padding: "7px 10px", fontSize: 13, minWidth: 180 }} />
            <button className="btn btn-primary btn-sm" onClick={addBoard} disabled={saving}>{saving ? "…" : t("pm.newBoard")}</button>
          </div>
        )}
      </div>

      {/* Навигация по месеци — само за ежемесечни */}
      {tab === "monthly" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setMonth(shiftPeriod(month, -1))}>{t("pm.prev")}</button>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, minWidth: 150, textAlign: "center" }}>{monthLabel(locale, month)}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setMonth(shiftPeriod(month, 1))}>{t("pm.next")}</button>
          {month !== periodKey(new Date()) && <button className="btn btn-ghost btn-sm" onClick={() => setMonth(periodKey(new Date()))}>{t("pm.thisMonth")}</button>}
          {canManage && <button className="btn btn-ghost btn-sm" onClick={copyPrevMonth} disabled={saving} title={t("pm.copyPrevTitle")}>{t("pm.copyPrev")}</button>}
          <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: "auto" }}>{t("pm.monthlyHint")}</span>
        </div>
      )}

      {error && (
        <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, marginBottom: 14 }}>{error}</div>
      )}

      {tab === "archive" ? (
        <ArchiveView boards={boards} assigneeLabel={assigneeLabel} onRestore={(t) => patchTask(t.id, { status: "assigned" })} onDelete={delTask} />
      ) : boards.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "44px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>{t("pm.emptyBoards")}</div>
          {canManage && <div style={{ fontSize: 12.5 }}>{t("pm.emptyBoardsHint")}</div>}
        </div>
      ) : (
        <div className="pm-scroll" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
          {boards.map((b) => {
            const accent = b.color ?? "var(--emerald)";
            const links = parseBoardLinks(b.links);
            const linkEntries = PM_LINK_FIELDS.filter((f) => links[f.key]);
            const tasks = b.tasks.filter((t) =>
              tab === "monthly"
                ? t.monthly && t.period === month && !t.archived
                : !t.monthly && !t.archived
            );
            return (
              <div key={b.id} className="glass pm-col" style={{ minWidth: 300, maxWidth: 320, flexShrink: 0, borderRadius: 14, padding: "12px 12px 14px", borderTop: `3px solid ${accent}` }}>
                <BoardHeader board={b} count={tasks.length} accent={accent} canManage={canManage} onRename={renameBoard} onDelete={() => delBoard(b)} />
                <BoardInfo board={b} links={links} linkEntries={linkEntries} canManage={canManage} onSaved={load} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} assignee={assigneeLabel(t)} onStatus={(s) => patchTask(t.id, { status: s })} onEdit={() => setTaskModal({ boardId: b.id, task: t })} onDelete={() => delTask(t)} />
                  ))}
                  {tasks.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "8px 0" }}>{t("pm.noTasks")}</div>}
                </div>

                <button onClick={() => setTaskModal({ boardId: b.id })} className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>{t("pm.addTask")}</button>
              </div>
            );
          })}
        </div>
      )}

      {taskModal && (
        <TaskModal boardId={taskModal.boardId} task={taskModal.task} members={members} monthly={tab === "monthly"} period={month} onClose={() => setTaskModal(null)} onSaved={() => { setTaskModal(null); load(); }} />
      )}
    </div>
  );
}

function BoardHeader({ board, count, accent, canManage, onRename, onDelete }: {
  board: Board; count: number; accent: string; canManage: boolean; onRename: (b: Board, name: string) => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  useEffect(() => { setName(board.name); }, [board.name]);

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onRename(board, name); setEditing(false); } if (e.key === "Escape") { setName(board.name); setEditing(false); } }}
          style={{ flex: 1, fontSize: 14, padding: "5px 8px" }} />
        <button className="btn btn-primary btn-sm" onClick={() => { onRename(board, name); setEditing(false); }}>OK</button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, flex: 1, minWidth: 0, wordBreak: "break-word" }}>{board.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: "rgba(0,0,0,.04)", borderRadius: 10, padding: "1px 8px" }}>{count}</span>
      {canManage && (
        <button onClick={() => setEditing(true)} title={t("pm.board.renameTitle")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}><UiIcon.edit width={14} height={14} /></button>
      )}
      {canManage && <button onClick={onDelete} title={t("pm.board.delTitle")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", display: "inline-flex" }}><UiIcon.trash width={14} height={14} /></button>}
    </div>
  );
}

function TaskCard({ task, assignee, onStatus, onEdit, onDelete }: {
  task: Task; assignee: string | null; onStatus: (s: string) => void; onEdit: () => void; onDelete: () => void;
}) {
  const { t, locale } = useI18n();
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
        <button onClick={onEdit} title={t("pm.card.editTitle")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "inline-flex" }}><UiIcon.edit width={13} height={13} /></button>
        <button onClick={onDelete} title={t("pm.card.delTitle")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      {task.description && <div style={{ fontSize: 12, color: "var(--ink)", marginTop: 4, whiteSpace: "pre-wrap" }}>{task.description}</div>}
      {task.notes && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, whiteSpace: "pre-wrap" }}><em>{t("pm.card.notesPrefix")}</em> {task.notes}</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: "rgba(0,0,0,.04)", borderRadius: 8, padding: "1px 7px" }}>{t(`pm.priority.${task.priority}`)}</span>
        {assignee && <span style={{ fontSize: 10.5, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "1px 7px" }}>{assignee}</span>}
        {due && <span style={{ fontSize: 10.5, fontWeight: 600, color: dueColor }}>{due.toLocaleDateString(locale)}{daysLeft != null && task.status !== "done" ? ` (${daysLeft < 0 ? t("pm.card.overdue", { n: -daysLeft }) : t("pm.card.daysLeft", { n: daysLeft })})` : ""}</span>}
      </div>

      {task.progress > 0 && task.status !== "done" && (
        <div style={{ height: 4, background: "rgba(217,215,200,.6)", borderRadius: 2, marginTop: 7 }}><div style={{ height: "100%", width: `${task.progress}%`, background: "var(--emerald)", borderRadius: 2 }} /></div>
      )}

      {links.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "var(--emerald-dark)", fontWeight: 600 }}>{l.label || t("pm.card.fileFallback")} ↗</a>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
        <select value={task.status} onChange={(e) => onStatus(e.target.value)} style={{ flex: 1, padding: "4px 6px", fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: "none", color: "#fff", background: st.color, cursor: "pointer" }}>
          {PM_STATUSES.map((s) => <option key={s.id} value={s.id} style={{ color: "#16201C" }}>{t(`pm.status.${s.id}`)}</option>)}
        </select>
      </div>
    </div>
  );
}

function BoardInfo({ board, links, linkEntries, canManage, onSaved }: {
  board: Board; links: Record<string, string>; linkEntries: { key: string; label: string }[]; canManage: boolean; onSaved: () => void;
}) {
  const { t } = useI18n();
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
            <label style={{ fontSize: 11, fontWeight: 600 }}>{t("pm.info.importantReq")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ fontSize: 12, padding: "6px 8px" }} placeholder={t("pm.info.notesPh")} />
          </div>
          {PM_LINK_FIELDS.map((f) => (
            <div key={f.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, width: 80, color: "var(--muted)" }}>{t(`pm.linkField.${f.key}`)}</span>
              <input value={lnk[f.key] ?? ""} onChange={(e) => setLnk({ ...lnk, [f.key]: e.target.value })} placeholder={t("pm.info.linkPh")} style={{ fontSize: 11.5, padding: "5px 7px" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(false)} disabled={busy}>{t("pm.info.cancel")}</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "…" : t("pm.info.save")}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .5, color: "var(--muted)", marginBottom: 6 }}>{t("pm.info.infoTitle")}</div>
          {board.importantNotes ? (
            <div style={{ marginBottom: linkEntries.length ? 8 : 0 }}><strong style={{ color: "var(--brick)" }}>{t("pm.info.important")}</strong> <span style={{ whiteSpace: "pre-wrap" }}>{board.importantNotes}</span></div>
          ) : !linkEntries.length ? <div style={{ color: "var(--muted)", marginBottom: canManage ? 8 : 0 }}>{t("pm.info.noInfo")}{canManage ? t("pm.info.noInfoManage") : "."}</div> : null}
          {linkEntries.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {linkEntries.map((f) => <a key={f.key} href={links[f.key]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--emerald-dark)", fontWeight: 600 }}>{t(`pm.linkField.${f.key}`)} ↗</a>)}
            </div>
          )}
          {canManage && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setEdit(true)}>{t("pm.info.editInfo")}</button>}
        </>
      )}
    </div>
  );
}

// Архив — приключените задачи, систематизирани по година → месец, с филтър по фирма
function ArchiveView({ boards, assigneeLabel, onRestore, onDelete }: {
  boards: Board[]; assigneeLabel: (t: Task) => string | null; onRestore: (t: Task) => void; onDelete: (t: Task) => void;
}) {
  const { t: tr, locale } = useI18n();
  const [firm, setFirm] = useState("all");
  const boardName = (id: string) => boards.find((b) => b.id === id)?.name ?? "—";

  const items: { t: Task; boardId: string }[] = [];
  for (const b of boards) {
    if (firm !== "all" && b.id !== firm) continue;
    for (const t of b.tasks) if (t.archived) items.push({ t, boardId: b.id });
  }
  items.sort((a, x) => new Date(x.t.archivedAt ?? 0).getTime() - new Date(a.t.archivedAt ?? 0).getTime());

  // групиране по "YYYY-MM"
  const groups = new Map<string, { t: Task; boardId: string }[]>();
  for (const it of items) {
    const d = it.t.archivedAt ? new Date(it.t.archivedAt) : null;
    const key = d ? periodKey(d) : "—";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{tr("pm.archive.hint")}</span>
        <select value={firm} onChange={(e) => setFirm(e.target.value)} style={{ padding: "6px 10px", fontSize: 13, marginLeft: "auto" }}>
          <option value="all">{tr("pm.archive.allFirms")}</option>
          {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="glass panel" style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>{tr("pm.archive.empty")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[...groups.entries()].map(([key, list]) => (
            <div key={key}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                {key === "—" ? tr("pm.archive.noDate") : monthLabel(locale, key)}
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emerald-dark)", background: "rgba(15,138,106,.12)", borderRadius: 10, padding: "1px 8px" }}>{list.length}</span>
              </div>
              <div className="glass panel" style={{ padding: 0, overflow: "hidden" }}>
                {list.map(({ t, boardId }, i) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderTop: i ? "1px solid rgba(0,0,0,.05)" : "none", fontSize: 12.5 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--navy)", background: "var(--navy-soft)", borderRadius: 8, padding: "1px 8px", whiteSpace: "nowrap" }}>{boardName(boardId)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{t.title}</span>
                      {assigneeLabel(t) && <span style={{ color: "var(--muted)" }}> · {assigneeLabel(t)}</span>}
                      {t.monthly && t.period && <span style={{ color: "var(--muted)" }}> · {tr("pm.archive.monthlyTag", { month: monthLabel(locale, t.period) })}</span>}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{t.archivedAt ? new Date(t.archivedAt).toLocaleDateString(locale) : ""}</span>
                    <button onClick={() => onRestore(t)} title={tr("pm.archive.restore")} className="btn btn-ghost btn-sm">↩</button>
                    <button onClick={() => onDelete(t)} title={tr("pm.archive.del")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brick)", fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskModal({ boardId, task, members, monthly, period, onClose, onSaved }: {
  boardId: string; task?: Task; members: Member[]; monthly: boolean; period: string; onClose: () => void; onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const [f, setF] = useState({
    title: task?.title ?? "", description: task?.description ?? "", notes: task?.notes ?? "",
    priority: task?.priority ?? "normal", status: task?.status ?? "pending", progress: task?.progress ?? 0,
    assignee: task?.assigneeName ?? (task?.assigneeId ? members.find((m) => m.userId === task.assigneeId)?.name ?? "" : ""),
    dueDate: task?.dueDate?.slice(0, 10) ?? "",
  });
  const [links, setLinks] = useState<TaskLink[]>(task ? parseTaskLinks(task.links) : []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!f.title.trim()) { setErr(t("pm.modal.errTitle")); return; }
    setBusy(true); setErr("");
    // Изпълнителят: ако въведеното съвпада със служител → assigneeId; иначе ръчно име
    const matched = members.find((m) => m.name.trim().toLowerCase() === f.assignee.trim().toLowerCase());
    const body = {
      title: f.title, description: f.description || null, notes: f.notes || null,
      priority: f.priority, status: f.status, progress: Number(f.progress),
      assigneeId: matched ? matched.userId : null,
      assigneeName: matched ? null : (f.assignee.trim() || null),
      dueDate: f.dueDate || null, links: links.filter((l) => l.url.trim()),
      ...(task ? {} : { boardId, monthly, period: monthly ? period : null }),
    };
    const res = await fetch(task ? `/api/pm/tasks/${task.id}` : "/api/pm/tasks", {
      method: task ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setErr((await res.json().catch(() => ({}))).error ?? t("pm.modal.errSave"));
  }

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 2000, padding: "6vh 16px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: "min(560px, 100%)", padding: 22, margin: "auto" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 14px" }}>{task ? t("pm.modal.editTitle") : (monthly ? t("pm.modal.newMonthly", { month: monthLabel(locale, period) }) : t("pm.modal.newTask"))}</h3>
        {err && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, marginBottom: 12 }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label>{t("pm.modal.title")}</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t("pm.modal.titlePh")} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>{t("pm.modal.desc")}</label><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t("pm.modal.descPh")} /></div>
          <div><label>{t("pm.modal.priority")}</label><select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{PM_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{t(`pm.priority.${p.id}`)}</option>)}</select></div>
          <div><label>{t("pm.modal.status")}</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{PM_STATUSES.map((s) => <option key={s.id} value={s.id}>{t(`pm.status.${s.id}`)}</option>)}</select></div>
          <div>
            <label>{t("pm.modal.assignee")}</label>
            <input list="pm-members" value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} placeholder={t("pm.modal.assigneePh")} />
            <datalist id="pm-members">{members.map((m) => <option key={m.userId} value={m.name} />)}</datalist>
          </div>
          <div><label>{t("pm.modal.due")}</label><input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>{t("pm.modal.progress", { n: f.progress })}</label><input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => setF({ ...f, progress: Number(e.target.value) })} style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label>{t("pm.modal.notes")}</label><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={t("pm.modal.notesPh")} /></div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>{t("pm.modal.links")}<button className="btn btn-ghost btn-sm" onClick={() => setLinks([...links, { label: "", url: "" }])}>{t("pm.modal.addLink")}</button></label>
          {links.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input value={l.label} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder={t("pm.modal.linkNamePh")} style={{ flex: 1, fontSize: 12.5, padding: "6px 8px" }} />
              <input value={l.url} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" style={{ flex: 2, fontSize: 12.5, padding: "6px 8px" }} />
              <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("pm.modal.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? t("pm.modal.saving") : t("pm.modal.save")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
