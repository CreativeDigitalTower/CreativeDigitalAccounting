"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/constants";
import { STATUSES } from "@/lib/crm";
import { ContextMenu, type MenuItem } from "@/components/app/ContextMenu";

export type ClientRow = {
  id: string; name: string; contactPerson: string | null; phone: string | null;
  status: string; month: number; total: number; openTasks: number;
};

export function ClientsList({ clients, grandMonth, grandTotal }: { clients: ClientRow[]; grandMonth: number; grandTotal: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
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
    if (!confirm(`Изтриване на клиент „${c.name}"?\nТова действие е необратимо.`)) return;
    const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert((await res.json()).error ?? "Грешка при изтриване.");
  }

  function menuItems(c: ClientRow): MenuItem[] {
    return [
      { label: "Отвори досие", icon: "👤", onClick: () => router.push(`/dashboard/clients/${c.id}`) },
      { label: "Нова фактура", icon: "🧾", onClick: () => router.push(`/dashboard/documents/new?clientId=${c.id}`) },
      { label: "Нова оферта", icon: "📄", onClick: () => router.push(`/dashboard/documents/new?clientId=${c.id}&type=quote`) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Копирай име", icon: "⧉", onClick: () => navigator.clipboard?.writeText(c.name) },
      { label: "Обедини с друг клиент", icon: "⇄", onClick: () => { setMergeSource(c); setMergeTarget(""); } },
      { label: "Изтрий клиент", icon: "🗑", danger: true, onClick: () => deleteClient(c) },
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
        <Kpi label="Приход (този месец)" value={formatCurrency(grandMonth)} color="var(--emerald-dark)" />
        <Kpi label="Приход (общо)" value={formatCurrency(grandTotal)} color="var(--navy)" />
        <Kpi label="Активни клиенти" value={String(clients.length)} color="var(--ink)" />
        <Kpi label="Отворени задачи" value={String(clients.reduce((s, c) => s + c.openTasks, 0))} color="var(--brass)" />
      </div>

      {/* Търсене + филтри по статус */}
      <div className="glass panel" style={{ padding: "12px 16px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="🔍 Търси по име, лице за контакт или телефон…"
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

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, marginBottom: 14 }}>{clients.length === 0 ? "Няма клиенти" : "Няма съвпадения по търсенето"}</div>
            {clients.length === 0 && <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm">Добави клиент</Link>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Клиент</th><th>Статус</th><th>Телефон</th>
                <th className="num">Приход (месец)</th><th className="num">Приход (общо)</th><th className="num">Задачи</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => {
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
                      <button onClick={() => deleteClient(client)} className="btn btn-ghost btn-sm" title="Изтрий клиент" style={{ color: "var(--brick)", borderColor: "var(--brick)" }}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right" }}>{filtered.length === clients.length ? "Общо:" : `Показани ${filtered.length}:`}</td>
                <td className="num">{formatCurrency(fMonth)}</td>
                <td className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(fTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

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
