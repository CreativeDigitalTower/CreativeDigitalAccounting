"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { STAGES } from "@/lib/crm";

type PClient = { id: string; name: string; stage: string; dealValue: number | null; total: number };

export function ClientPipeline({ initial }: { initial: PClient[] }) {
  const [clients, setClients] = useState(initial);
  const [drag, setDrag] = useState<string | null>(null);

  async function move(id: string, stage: string) {
    setClients((cs) => cs.map((c) => c.id === id ? { ...c, stage } : c));
    await fetch(`/api/clients/${id}/stage`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
  }

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
      {STAGES.map((st) => {
        const list = clients.filter((c) => c.stage === st.id);
        const sum = list.reduce((s, c) => s + (c.dealValue ?? 0), 0);
        return (
          <div key={st.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag) move(drag, st.id); setDrag(null); }}
            style={{ minWidth: 220, flex: "1 0 220px", background: "rgba(255,255,255,.4)", border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{st.label}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{list.length}</span>
            </div>
            {sum > 0 && <div style={{ fontSize: 11, color: "var(--emerald-dark)", marginBottom: 8 }}>Σ {formatCurrency(sum)}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 40 }}>
              {list.map((c) => (
                <div key={c.id} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}
                  className="glass" style={{ padding: "10px 12px", borderRadius: 8, cursor: "grab", border: drag === c.id ? "2px dashed var(--emerald)" : "1px solid var(--border)" }}>
                  <Link href={`/dashboard/clients/${c.id}`} style={{ fontWeight: 600, fontSize: 13, textDecoration: "none", color: "inherit" }}>{c.name}</Link>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                    {c.dealValue ? `Сделка: ${formatCurrency(c.dealValue)}` : `Фактурирано: ${formatCurrency(c.total)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
