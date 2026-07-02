"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { STATUSES } from "@/lib/crm";
import { ContextMenu, type MenuItem } from "@/components/app/ContextMenu";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

export type ClientRow = {
  id: string; name: string; contactPerson: string | null; phone: string | null;
  status: string; month: number; total: number; openTasks: number;
};

export function ClientsList({ clients, grandMonth, grandTotal }: { clients: ClientRow[]; grandMonth: number; grandTotal: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; client: ClientRow } | null>(null);
  const [mergeSource, setMergeSource] = useState<ClientRow | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);

  async function doMerge() {
    if (!mergeSource || !mergeTarget) return;
    setMerging(true);
    const res = await fetch(`/api/clients/${mergeSource.id}/merge`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intoId: mergeTarget }),
    });
    setMerging(false);
    if (res.ok) { setMergeSource(null); setMergeTarget(""); router.refresh(); }
    else alert((await res.json()).error ?? "Грешка при обединяване.");
  }

  async function deleteClient(c: ClientRow) {
    if (!(await confirmDelete(`клиент „${c.name}"`))) return;
    const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Грешка при изтриване.");
  }

  function menuItems(c: ClientRow): MenuItem[] {
    return [
      { label: "Отвори досие", icon: <UiIcon.people width={15} height={15} />, onClick: () => router.push(`/dashboard/clients/${c.id}`) },
      { label: "Нова фактура", icon: <UiIcon.doc width={15} height={15} />, onClick: () => router.push(`/dashboard/documents/new?clientId=${c.id}`) },
      { label: "Нова оферта", icon: <UiIcon.doc width={15} height={15} />, onClick: () => router.push(`/dashboard/documents/new?clientId=${c.id}&type=quote`) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Копирай име", icon: "⧉", onClick: () => navigator.clipboard?.writeText(c.name) },
      { label: "Обедини с друг клиент", icon: "⇄", onClick: () => { setMergeSource(c); setMergeTarget(""); } },
      { label: "Изтрий клиент", icon: <UiIcon.trash width={15} height={15} />, danger: true, onClick: () => deleteClient(c) },
    ];
  }

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of clients) m[c.status] = (m[c.status] ?? 0) + 1;
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!term) return true;
      return [c.name, c.contactPerson, c.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(term));
    });
  }, [clients, q, status]);

  const fMonth = filtered.reduce((s, c) => s + c.month, 0);
  const fTotal = filtered.reduce((s, c) => s + c.total, 0);

  return (
    <>
      {/* Приходи */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 }}>
        <Kpi label="Месечни абонаменти" value={formatCurrency(grandMonth)} color="var(--emerald-dark)" />
        <Kpi label="Приход (общо)" value={formatCurrency(grandTotal)} color="var(--navy)" />
        <Kpi label="Активни клиенти" value={String(counts["active"] ?? 0)} color="var(--ink)" />
        <Kpi label="Отворени задачи" value={String(clients.reduce((s, c) => s + c.openTasks, 0))} color="var(--brass)" />
      </div>

      {/* Търсене + филтри по статус */}
      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Търси по име, лице за контакт или телефон…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 280px", minWidth: 220, padding: "8px 12px" }}
        />
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button className={`filter-tab${status === "all" ? " active" : ""}`} onClick={() => setStatus("all")}>Всички ({clients.length})</button>
          {STATUSES.map((s) => (
            <button key={s.id} className={`filter-tab${status === s.id ? " active" : ""}`} onClick={() => setStatus(s.id)}>
              {s.label} ({counts[s.id] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {(() => {
        const renderRow = (client: ClientRow) => {
          const s = STATUSES.find((x) => x.id === client.status) ?? STATUSES[1];
          return (
            <tr key={client.id} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, client }); }}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy-soft)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                    {client.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/dashboard/clients/${client.id}`} style={{ fontWeight: 600, fontSize: 13.5, color: "inherit", textDecoration: "none" }}>{client.name}</Link>
                    {client.contactPerson && <div style={{ fontSize: 12, color: "var(--muted)" }}>{client.contactPerson}</div>}
                  </div>
                </div>
              </td>
              <td><span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: s.color, borderRadius: 14, padding: "2px 9px" }}>{s.label}</span></td>
              <td style={{ fontSize: 13 }}>{client.phone ?? "—"}</td>
              <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(client.month)}</td>
              <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(client.total)}</td>
              <td className="num">{client.openTasks > 0 ? <span style={{ color: "var(--brass)", fontWeight: 700 }}>{client.openTasks}</span> : "—"}</td>
              <td style={{ display: "flex", gap: 6 }}>
                <Link href={`/dashboard/clients/${client.id}`} className="btn btn-ghost btn-sm">Досие</Link>
                <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">+ Фактура</Link>
                <button onClick={() => deleteClient(client)} className="btn btn-ghost btn-sm" title="Изтрий клиент" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>
              </td>
            </tr>
          );
        };
        const Head = () => (
          <thead><tr>
            <th>Клиент</th><th>Статус</th><th>Телефон</th>
            <th className="num">Месечен абонамент</th><th className="num">Приход (общо)</th><th className="num">Задачи</th><th></th>
          </tr></thead>
        );

        // Разделяме неактивните/загубените клиенти в отделна секция долу (само при изглед „Всички").
        const splitInactive = status === "all";
        const inactiveSet = new Set(["inactive", "lost"]);
        const mainRows = splitInactive ? filtered.filter((c) => !inactiveSet.has(c.status)) : filtered;
        const inactiveRows = splitInactive ? filtered.filter((c) => inactiveSet.has(c.status)) : [];
        const mMonth = mainRows.reduce((s, c) => s + c.month, 0);
        const mTotal = mainRows.reduce((s, c) => s + c.total, 0);

        return (
          <>
            <div className="glass panel" style={{ padding: "8px 0" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "var(--muted)" }}><UiIcon.people width={32} height={32} /></div>
                  <div style={{ fontSize: 14, marginBottom: 14 }}>{clients.length === 0 ? "Няма клиенти" : "Няма съвпадения по търсенето"}</div>
                  {clients.length === 0 && <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm">Добави клиент</Link>}
                </div>
              ) : mainRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>Няма активни клиенти в този изглед.</div>
              ) : (
                <table>
                  <Head />
                  <tbody>{mainRows.map(renderRow)}</tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                      <td colSpan={3} style={{ textAlign: "right" }}>{!splitInactive && filtered.length === clients.length ? "Общо:" : `Показани ${mainRows.length}:`}</td>
                      <td className="num">{formatCurrency(splitInactive ? mMonth : fMonth)}</td>
                      <td className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(splitInactive ? mTotal : fTotal)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Неактивни / загубени клиенти — изнесени и сгъваеми, за по-структуриран изглед */}
            {inactiveRows.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setShowInactive((v) => !v)}
                  className="glass panel"
                  style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, fontWeight: 600 }}
                >
                  <span style={{ color: "var(--muted)" }}>{showInactive ? "▼" : "▶"}</span>
                  Неактивни клиенти ({inactiveRows.length})
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{showInactive ? "скрий" : "покажи"}</span>
                </button>
                {showInactive && (
                  <div className="glass panel" style={{ padding: "8px 0", marginTop: 8 }}>
                    <table>
                      <Head />
                      <tbody>{inactiveRows.map(renderRow)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Диаграма с приходите по клиенти */}
      {(() => {
        const top = [...filtered].filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
        if (top.length === 0) return null;
        const max = top[0].total || 1;
        const COLORS = ["#0F8A6A", "#2C4A66", "#A5812E", "#3F9C82", "#A23B2B", "#0B5E4A", "#6B7C76", "#C9A227", "#245C4A", "#8A4B3B"];
        return (
          <div className="glass panel" style={{ marginTop: 16, padding: "18px 20px" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 14px" }}>Приходи по клиенти (топ {top.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top.map((c, i) => (
                <div key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span className="num" style={{ color: "var(--ink-soft)" }}>{formatCurrency(c.total)}</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden" }}>
                    <div className="chart-bar" style={{ width: `${(c.total / max) * 100}%`, height: "100%", background: COLORS[i % COLORS.length], borderRadius: 4, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems(menu.client)} onClose={() => setMenu(null)} />}

      {mergeSource && (
        <div onClick={() => setMergeSource(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ width: 440, maxWidth: "100%", padding: 24, borderRadius: 14 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 6px" }}>Обединяване на клиенти</h3>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 14px" }}>
              „{mergeSource.name}" ще бъде обединен в избрания клиент. Всички фактури, суми и данни се прехвърлят, а дублиращият профил се изтрива.
            </p>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Обедини в:</label>
            <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} style={{ marginBottom: 14 }}>
              <option value="">— Изберете клиент —</option>
              {clients.filter((c) => c.id !== mergeSource.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMergeSource(null)}>Отказ</button>
              <button className="btn btn-primary btn-sm" disabled={!mergeTarget || merging} onClick={doMerge}>{merging ? "Обединяване…" : "Обедини"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass panel" style={{ padding: "14px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
