"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";

type Row = { id: string; number: string; date: string | null; currency: string; client: string; lines: number; net: number; gross: number };
type Inv = { id: string; productSnapshot: string | null; unit: string; sourceInvoice: string; shipmentCode: string | null; received: number; sold: number; remaining: number };
type Client = { id: string; name: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function MkSales({ canManage, clients }: { canManage: boolean; clients: Client[] }) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [inv, setInv] = useState<Inv[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hdr, setHdr] = useState({ clientId: "", date: "", vatRate: "18", currency: "MKD" });
  const [pick, setPick] = useState<Record<string, { qty: string; price: string }>>({});

  async function load() {
    const [rl, ri] = await Promise.all([fetch("/api/logistics/mk-sales"), fetch("/api/logistics/mk-sales/inventory")]);
    if (rl.ok) setRows(await rl.json());
    if (ri.ok) setInv(await ri.json());
  }
  useEffect(() => { load(); }, []);

  const rate = hdr.vatRate ? Number(hdr.vatRate) : 0;
  const selected = useMemo(() => inv.filter((s) => pick[s.id]?.qty && pick[s.id]?.price && Number(pick[s.id].qty) > 0), [inv, pick]);
  const totals = useMemo(() => {
    let net = 0;
    for (const s of selected) net = round2(net + round2(Number(pick[s.id].qty) * Number(pick[s.id].price)));
    return { net, gross: round2(net * (1 + rate / 100)) };
  }, [selected, pick, rate]);
  const overCap = selected.some((s) => Number(pick[s.id].qty) > s.remaining + 1e-9);

  function setPickField(id: string, k: "qty" | "price", v: string) {
    setPick((p) => {
      const base = p[id] ?? { qty: "", price: "" };
      return { ...p, [id]: { ...base, [k]: v } };
    });
  }

  async function create() {
    if (selected.length === 0) { setErr(t("logistics.mksale.selectAtLeastOne")); return; }
    if (overCap) { setErr(t("logistics.mksale.overCap")); return; }
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/mk-sales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: hdr.clientId || null, date: hdr.date ? new Date(hdr.date).toISOString() : null, currency: hdr.currency, vatRate: hdr.vatRate ? Number(hdr.vatRate) : null,
        lines: selected.map((s) => ({ sourceBgMkLineId: s.id, quantity: Number(pick[s.id].qty), unitPrice: Number(pick[s.id].price) })),
      }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setPick({}); setHdr({ clientId: "", date: "", vatRate: "18", currency: "MKD" }); setOpen(false); load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 7px", fontSize: 12.5 } as const;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.mksale.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.mksale.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
            <div style={{ minWidth: 200 }}><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.mksale.client")}</label>
              <SearchableSelect options={clients.map((c) => ({ value: c.id, label: c.name }))} value={hdr.clientId} onChange={(v) => setHdr({ ...hdr, clientId: v })} placeholder={t("logistics.mksale.selectClient")} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.mksale.date")}</label><br /><input type="date" style={inp} value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.mksale.currency")}</label><br /><input style={{ ...inp, width: 60 }} value={hdr.currency} onChange={(e) => setHdr({ ...hdr, currency: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.mksale.vatRate")}</label><br /><input type="number" step="0.01" style={{ ...inp, width: 64 }} value={hdr.vatRate} onChange={(e) => setHdr({ ...hdr, vatRate: e.target.value })} /></div>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.mksale.inventory")}</div>
          {inv.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.mksale.noInventory")}</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>{t("logistics.mksale.product")}</th><th style={th}>{t("logistics.mksale.bgMkInvoice")}</th>
                  <th style={th}>{t("logistics.mksale.received")}</th><th style={th}>{t("logistics.mksale.sold")}</th><th style={th}>{t("logistics.mksale.remaining")}</th>
                  <th style={th}>{t("logistics.mksale.quantity")}</th><th style={th}>{t("logistics.mksale.unitPrice")}</th><th style={th}>{t("logistics.mksale.lineTotal")}</th>
                </tr></thead>
                <tbody>
                  {inv.map((s) => {
                    const q = pick[s.id]?.qty ? Number(pick[s.id].qty) : null;
                    const p = pick[s.id]?.price ? Number(pick[s.id].price) : null;
                    const lt = q != null && p != null ? round2(q * p) : null;
                    const over = q != null && q > s.remaining + 1e-9;
                    return (
                      <tr key={s.id}>
                        <td style={td}>{s.productSnapshot ?? "—"}</td>
                        <td style={td}>{s.sourceInvoice}{s.shipmentCode ? ` · ${s.shipmentCode}` : ""}</td>
                        <td style={td} className="num">{s.received} {s.unit}</td>
                        <td style={td} className="num">{s.sold}</td>
                        <td style={{ ...td, fontWeight: 600 }} className="num">{s.remaining}</td>
                        <td style={td}><input type="number" step="0.001" style={{ ...inp, width: 78, borderColor: over ? "var(--brick)" : undefined }} value={pick[s.id]?.qty ?? ""} onChange={(e) => setPickField(s.id, "qty", e.target.value)} placeholder={`≤ ${s.remaining}`} /></td>
                        <td style={td}><input type="number" step="0.01" style={{ ...inp, width: 78 }} value={pick[s.id]?.price ?? ""} onChange={(e) => setPickField(s.id, "price", e.target.value)} /></td>
                        <td style={td} className="num">{lt ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5 }}>{t("logistics.mksale.net")}: <strong className="num">{totals.net} {hdr.currency}</strong></span>
            <span style={{ fontSize: 13 }}>{t("logistics.mksale.gross")}: <strong className="num">{totals.gross} {hdr.currency}</strong></span>
            {overCap && <span style={{ color: "var(--brick)", fontSize: 12 }}>{t("logistics.mksale.overCap")}</span>}
            <button className="btn btn-primary btn-sm" disabled={busy || selected.length === 0 || overCap} onClick={create} style={{ marginLeft: "auto" }}>{t("logistics.mksale.create")}</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.mksale.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.mksale.number")}</th><th style={th}>{t("logistics.mksale.date")}</th><th style={th}>{t("logistics.mksale.client")}</th>
              <th style={th}>{t("logistics.holcimInv.shipments")}</th><th style={th}>{t("logistics.mksale.net")}</th><th style={th}>{t("logistics.mksale.gross")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/mk-sales/${r.id}`} style={{ fontWeight: 600 }}>{r.number}</Link></td>
                  <td style={td}>{dt(r.date)}</td><td style={td}>{r.client}</td>
                  <td style={td} className="num">{r.lines}</td><td style={td} className="num">{r.net} {r.currency}</td><td style={td} className="num">{r.gross} {r.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
