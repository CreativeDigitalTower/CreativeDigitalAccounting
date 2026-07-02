"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { NavIcon, UiIcon } from "@/components/app/NavIcons";

export type WidgetData = {
  recentInvoices: { id: string; number: string; client: string; total: number; currency: string; status: string }[];
  topClients: { name: string; revenue: number }[];
  taxDeadlines: { label: string; date: string }[];
  lowStock: { name: string; quantity: number; unit: string }[];
  reminders: { id: string; number: string; client: string; total: number; daysOverdue: number }[];
  openTasks: number;
  stockValue: number;
  revenue: number;
  expenses: number;
  clientsCount: number;
};

type WidgetDef = { id: string; title: string; icon: React.ReactNode };
const wi = { width: 15, height: 15 };
const CATALOG: WidgetDef[] = [
  { id: "recent_invoices", title: "Последни фактури", icon: <NavIcon.invoice {...wi} /> },
  { id: "revenue_expense", title: "Приходи / Разходи", icon: <NavIcon.analytics {...wi} /> },
  { id: "top_clients", title: "Най-добри клиенти", icon: <UiIcon.star {...wi} /> },
  { id: "reminders", title: "Напомняния за плащане", icon: <UiIcon.bell {...wi} /> },
  { id: "tasks", title: "Задачи", icon: <UiIcon.check {...wi} /> },
  { id: "stock", title: "Склад", icon: <NavIcon.warehouse {...wi} /> },
  { id: "low_stock", title: "Ниски наличности", icon: <UiIcon.warning {...wi} /> },
  { id: "ai", title: "AI препоръки", icon: <NavIcon.dashboard {...wi} /> },
];
const DEFAULT_ORDER = ["recent_invoices", "revenue_expense", "top_clients", "reminders", "tasks", "stock"];
const KEY = "cda_widgets_v2";

export function WidgetBoard({ data }: { data: WidgetData }) {
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<string[]>(CATALOG.map((c) => c.id).filter((id) => !DEFAULT_ORDER.includes(id)));
  const [edit, setEdit] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) { const p = JSON.parse(saved); if (p.order) setOrder(p.order); if (p.hidden) setHidden(p.hidden); }
    } catch {}
    setReady(true);
  }, []);

  function persist(o: string[], h: string[]) { try { localStorage.setItem(KEY, JSON.stringify({ order: o, hidden: h })); } catch {} }
  function onDrop(target: number) {
    if (drag === null || drag === target) return;
    const next = [...order]; const [m] = next.splice(drag, 1); next.splice(target, 0, m);
    setOrder(next); setDrag(null); persist(next, hidden);
  }
  function hide(id: string) { const o = order.filter((x) => x !== id); const h = [...hidden, id]; setOrder(o); setHidden(h); persist(o, h); }
  function show(id: string) { const h = hidden.filter((x) => x !== id); const o = [...order, id]; setHidden(h); setOrder(o); persist(o, h); }

  if (!ready) return null;
  const cards = order.filter((id) => CATALOG.find((c) => c.id === id));

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Моето табло <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>· персонализируемо</span></h3>
        <button onClick={() => setEdit((v) => !v)} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{edit ? "Готово" : <><UiIcon.edit width={14} height={14} /> Персонализирай</>}</button>
      </div>

      {edit && (
        <div className="glass panel pop-in" style={{ padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>Изберете кои widget-и да виждате. Влачете картите, за да ги подредите.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATALOG.map((w) => {
              const on = !hidden.includes(w.id);
              return (
                <button key={w.id} onClick={() => (on ? hide(w.id) : show(w.id))}
                  className={`filter-tab${on ? " active" : ""}`} style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {on ? <UiIcon.check width={13} height={13} /> : <span style={{ width: 13, height: 13, border: "1.5px solid currentColor", borderRadius: 3, display: "inline-block", opacity: .5 }} />} {w.icon} {w.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {cards.map((id, idx) => {
          const def = CATALOG.find((c) => c.id === id)!;
          return (
            <div key={id}
              draggable={edit}
              onDragStart={() => setDrag(idx)} onDragOver={(e) => edit && e.preventDefault()} onDrop={() => onDrop(idx)} onDragEnd={() => setDrag(null)}
              className="glass panel kpi-anim" style={{ padding: "16px 18px", cursor: edit ? "grab" : "default", border: drag === idx ? "2px dashed var(--emerald)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 14.5, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ display: "inline-flex" }}>{def.icon}</span> {def.title}
                </h4>
                {edit ? <button onClick={() => hide(id)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 15 }} title="Скрий">×</button>
                      : <span style={{ color: "var(--muted)", fontSize: 12 }}>⠿</span>}
              </div>
              <Widget id={id} data={data} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "6px 0" }}>{text}</div>; }
const rowS: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(217,215,200,.4)", fontSize: 13 };

function Widget({ id, data }: { id: string; data: WidgetData }) {
  switch (id) {
    case "recent_invoices":
      return data.recentInvoices.length === 0 ? <Empty text="Няма фактури." /> : <>
        {data.recentInvoices.slice(0, 5).map((d) => (
          <Link key={d.id} href={`/dashboard/documents/${d.id}`} style={{ ...rowS, textDecoration: "none", color: "inherit" }}>
            <span><strong className="num" style={{ fontSize: 12.5 }}>{d.number}</strong> · {d.client}</span>
            <span className="num" style={{ fontWeight: 600 }}>{formatCurrency(d.total, d.currency)}</span>
          </Link>
        ))}
      </>;
    case "revenue_expense": {
      const max = Math.max(data.revenue, data.expenses, 1);
      const Bar = ({ label, v, c }: { label: string; v: number; c: string }) => (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span>{label}</span><span className="num" style={{ fontWeight: 700, color: c }}>{formatCurrency(v)}</span></div>
          <div style={{ height: 8, background: "rgba(217,215,200,.5)", borderRadius: 4, overflow: "hidden" }}><div className="chart-bar" style={{ height: "100%", width: `${(v / max) * 100}%`, background: c, borderRadius: 4, transition: "width .5s cubic-bezier(.22,1,.36,1)" }} /></div>
        </div>
      );
      return <>
        <Bar label="Приходи" v={data.revenue} c="var(--emerald)" />
        <Bar label="Разходи" v={data.expenses} c="var(--brick)" />
        <div style={{ fontSize: 12.5, marginTop: 6 }}>Печалба: <strong className="num" style={{ color: data.revenue - data.expenses >= 0 ? "var(--emerald-dark)" : "var(--brick)" }}>{formatCurrency(data.revenue - data.expenses)}</strong></div>
      </>;
    }
    case "top_clients":
      return data.topClients.length === 0 ? <Empty text="Няма данни." /> : <>
        {data.topClients.slice(0, 5).map((c, i) => (
          <div key={i} style={rowS}><span>{i + 1}. {c.name}</span><span className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(c.revenue)}</span></div>
        ))}
      </>;
    case "reminders":
      return data.reminders.length === 0 ? <Empty text="Няма предстоящи плащания." /> : <>
        {data.reminders.slice(0, 5).map((r) => (
          <Link key={r.id} href={`/dashboard/documents/${r.id}`} style={{ ...rowS, textDecoration: "none", color: "inherit" }}>
            <span>{r.number} · {r.client}</span>
            <span style={{ fontWeight: 700, fontSize: 11.5, color: r.daysOverdue > 0 ? "var(--brick)" : "var(--brass)" }}>{r.daysOverdue > 0 ? `просрочена ${r.daysOverdue}д` : `до падеж ${-r.daysOverdue}д`}</span>
          </Link>
        ))}
      </>;
    case "tasks":
      return <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div className="num" style={{ fontSize: 34, fontWeight: 700, color: data.openTasks > 0 ? "var(--brass)" : "var(--emerald-dark)" }}>{data.openTasks}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>отворени CRM задачи</div>
        <Link href="/dashboard/clients" className="btn btn-ghost btn-sm">Виж задачите</Link>
      </div>;
    case "stock":
      return <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div className="num" style={{ fontSize: 26, fontWeight: 700, color: "var(--emerald-dark)" }}>{formatCurrency(data.stockValue)}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>обща стойност на склада</div>
        <Link href="/dashboard/warehouse" className="btn btn-ghost btn-sm">Към склада</Link>
      </div>;
    case "low_stock":
      return data.lowStock.length === 0 ? <Empty text="Всички наличности са в норма ✓" /> : <>
        {data.lowStock.slice(0, 6).map((i, k) => (
          <div key={k} style={rowS}><span>{i.name}</span><span className="num" style={{ color: "var(--brick)", fontWeight: 600 }}>{i.quantity} {i.unit}</span></div>
        ))}
      </>;
    case "tax":
      return data.taxDeadlines.length === 0 ? <Empty text="Няма предстоящи срокове." /> : <>
        {data.taxDeadlines.slice(0, 5).map((t, i) => (
          <div key={i} style={rowS}><span>{t.label}</span><span className="num" style={{ color: "var(--brass)", fontWeight: 600 }}>{t.date}</span></div>
        ))}
      </>;
    case "ai":
      return <div style={{ textAlign: "center", padding: "14px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: "var(--muted)" }}><NavIcon.dashboard width={28} height={28} /></div>
        <div style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 12, padding: "2px 10px" }}>СКОРО</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>Интелигентни препоръки за бизнеса Ви.</div>
      </div>;
    default:
      return null;
  }
}
