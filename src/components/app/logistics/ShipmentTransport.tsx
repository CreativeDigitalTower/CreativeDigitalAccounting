"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { TRANSPORT_MILESTONES } from "@/lib/logistics/config";
import { milestoneState } from "@/lib/logistics/transport";

type M = { milestone: string; expectedFrom: string | null; expectedTo: string | null; actualAt: string | null; note: string | null };
const toLocal = (s: string | null) => s ? new Date(s).toISOString().slice(0, 16) : "";

export function ShipmentTransport({ shipmentId, canManage }: { shipmentId: string; canManage: boolean }) {
  const t = useT();
  const [rows, setRows] = useState<Record<string, M>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/milestones`);
    if (r.ok) { const list: M[] = await r.json(); setRows(Object.fromEntries(list.map((m) => [m.milestone, m]))); }
  }
  useEffect(() => { load(); }, [shipmentId]);

  async function save(milestone: string, patch: Partial<M> & { confirmNow?: boolean }) {
    setBusy(true);
    const cur = rows[milestone];
    const body = {
      milestone,
      expectedFrom: patch.expectedFrom !== undefined ? patch.expectedFrom : cur?.expectedFrom ?? null,
      expectedTo: patch.expectedTo !== undefined ? patch.expectedTo : cur?.expectedTo ?? null,
      actualAt: patch.actualAt !== undefined ? patch.actualAt : undefined,
      confirmNow: patch.confirmNow,
    };
    const r = await fetch(`/api/logistics/shipments/${shipmentId}/milestones`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) load();
  }

  const badge = (m: M | undefined) => {
    const st = milestoneState({ expectedFrom: m?.expectedFrom, expectedTo: m?.expectedTo, actualAt: m?.actualAt });
    if (st === "confirmed") return <span style={{ color: "var(--emerald-dark,#0F8A6A)", fontSize: 11 }}>{t("logistics.transport.stConfirmed")}</span>;
    if (st === "delayed") return <span style={{ color: "var(--brick)", fontSize: 11, fontWeight: 700 }}>{t("logistics.transport.delayedBadge")}</span>;
    if (st === "pending") return <span style={{ color: "var(--brass)", fontSize: 11 }}>{t("logistics.transport.stPending")}</span>;
    return null;
  };
  const inp = { padding: "4px 6px", fontSize: 12 } as const;

  return (
    <div>
      <h4 style={{ fontSize: 12.5, margin: "10px 0 6px", color: "var(--muted)" }}>{t("logistics.transport.title")}</h4>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {TRANSPORT_MILESTONES.map((mk) => {
              const m = rows[mk];
              return (
                <tr key={mk} style={{ borderTop: "1px solid rgba(217,215,200,.4)" }}>
                  <td style={{ padding: "5px 6px", fontWeight: 600, whiteSpace: "nowrap" }}>{t(`logistics.milestones.${mk}`)}</td>
                  <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>
                    {canManage ? (
                      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        <input type="datetime-local" style={inp} defaultValue={toLocal(m?.expectedFrom ?? null)} onBlur={(e) => save(mk, { expectedFrom: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                        <span>–</span>
                        <input type="datetime-local" style={inp} defaultValue={toLocal(m?.expectedTo ?? null)} onBlur={(e) => save(mk, { expectedTo: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                      </span>
                    ) : (m?.expectedFrom ? `${new Date(m.expectedFrom).toLocaleString()} – ${m.expectedTo ? new Date(m.expectedTo).toLocaleString() : "…"}` : "—")}
                  </td>
                  <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>{m?.actualAt ? new Date(m.actualAt).toLocaleString() : (canManage ? <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save(mk, { confirmNow: true })}>{t("logistics.transport.confirm")}</button> : "—")}</td>
                  <td style={{ padding: "5px 6px" }}>{badge(m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
