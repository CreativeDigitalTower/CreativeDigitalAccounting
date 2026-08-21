"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type Row = { id: string; number: string; date: string | null; currency: string; party: string; direction: string; lines: number; net: number; gross: number };
type Sellable = { id: string; code: string; productNameSnapshot: string | null; netQuantity: number; unit: string; vehicleRegSnapshot: string | null; dispatchNoteNumber: string | null };
type Counterparty = { id: string; name: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function BgMkInvoices({ canManage, counterparties }: { canManage: boolean; counterparties: Counterparty[] }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [issued, setIssued] = useState<Row[]>([]);
  const [received, setReceived] = useState<Row[]>([]);
  const [sellable, setSellable] = useState<Sellable[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hdr, setHdr] = useState({ counterpartyId: counterparties[0]?.id ?? "", date: "", vatRate: "18" });
  const [prices, setPrices] = useState<Record<string, string>>({});

  async function load() {
    const [ri, rs] = await Promise.all([fetch("/api/logistics/bg-mk-invoices"), fetch("/api/logistics/bg-mk-invoices/sellable")]);
    if (ri.ok) { const j = await ri.json(); setIssued(j.issued ?? []); setReceived(j.received ?? []); }
    if (rs.ok) setSellable(await rs.json());
  }
  useEffect(() => { load(); }, []);

  const rate = hdr.vatRate ? Number(hdr.vatRate) : 0;
  const selected = useMemo(() => sellable.filter((s) => prices[s.id] !== undefined && prices[s.id] !== ""), [sellable, prices]);
  const totals = useMemo(() => {
    let net = 0;
    for (const s of selected) net = round2(net + round2(s.netQuantity * Number(prices[s.id])));
    return { net, gross: round2(net * (1 + rate / 100)) };
  }, [selected, prices, rate]);

  async function create() {
    if (selected.length === 0) { setErr(t("logistics.bgmk.selectAtLeastOne")); return; }
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/bg-mk-invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counterpartyCompanyId: hdr.counterpartyId, date: hdr.date ? new Date(hdr.date).toISOString() : null, vatRate: hdr.vatRate ? Number(hdr.vatRate) : null,
        lines: selected.map((s) => ({ shipmentId: s.id, unitPrice: Number(prices[s.id]) })),
      }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setPrices({}); setHdr({ counterpartyId: counterparties[0]?.id ?? "", date: "", vatRate: "18" }); setOpen(false); load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  const inp = { padding: "5px 7px", fontSize: 12.5 } as const;

  const Table = ({ rows, dirLabel }: { rows: Row[]; dirLabel: string }) => (
    <div className="glass panel" style={{ overflowX: "auto", marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{dirLabel}</div>
      {rows.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.bgmk.empty")}</div> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={th}>{t("logistics.bgmk.number")}</th><th style={th}>{t("logistics.bgmk.date")}</th><th style={th}>{t("logistics.bgmk.party")}</th>
            <th style={th}>{t("logistics.holcimInv.shipments")}</th><th style={th}>{t("logistics.bgmk.net")}</th><th style={th}>{t("logistics.bgmk.gross")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}><Link href={`/dashboard/logistics/bg-mk/${r.id}`} style={{ fontWeight: 600 }}>{r.number}</Link></td>
                <td style={td}>{dt(r.date)}</td><td style={td}>{r.party}</td>
                <td style={td} className="num">{r.lines}</td><td style={td} className="num">{r.net} {r.currency}</td><td style={td} className="num">{r.gross} {r.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.bgmk.title")}</h1>
        {canManage && counterparties.length > 0 && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.bgmk.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      {counterparties.length === 0 && <div className="glass panel" style={{ marginBottom: 14, fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.bgmk.noCounterparty")}</div>}

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.bgmk.counterparty")}</label><br />
              <select style={inp} value={hdr.counterpartyId} onChange={(e) => setHdr({ ...hdr, counterpartyId: e.target.value })}>
                {counterparties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.bgmk.date")}</label><br /><input type="date" style={inp} value={hdr.date} onChange={(e) => setHdr({ ...hdr, date: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.bgmk.vatRate")}</label><br /><input type="number" step="0.01" style={{ ...inp, width: 70 }} value={hdr.vatRate} onChange={(e) => setHdr({ ...hdr, vatRate: e.target.value })} /></div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("logistics.bgmk.sellable")}</div>
          {sellable.length === 0 ? <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{t("logistics.bgmk.noSellable")}</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}></th><th style={th}>{t("logistics.bgmk.shipment")}</th><th style={th}>{t("logistics.bgmk.product")}</th>
                  <th style={th}>{t("logistics.bgmk.quantity")}</th><th style={th}>{t("logistics.bgmk.unitPrice")}</th><th style={th}>{t("logistics.bgmk.lineTotal")}</th>
                </tr></thead>
                <tbody>
                  {sellable.map((s) => {
                    const on = prices[s.id] !== undefined;
                    const lt = on && prices[s.id] ? round2(s.netQuantity * Number(prices[s.id])) : null;
                    return (
                      <tr key={s.id}>
                        <td style={td}><input type="checkbox" checked={on} onChange={(e) => setPrices((p) => { const n = { ...p }; if (e.target.checked) n[s.id] = ""; else delete n[s.id]; return n; })} /></td>
                        <td style={td}>{s.code}</td><td style={td}>{s.productNameSnapshot ?? "—"}</td>
                        <td style={td} className="num">{qtyUnit(s.netQuantity, s.unit)}</td>
                        <td style={td}>{on && <input type="number" step="0.01" style={{ ...inp, width: 80 }} value={prices[s.id]} onChange={(e) => setPrices((p) => ({ ...p, [s.id]: e.target.value }))} />}</td>
                        <td style={td} className="num">{lt ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5 }}>{t("logistics.bgmk.net")}: <strong className="num">{totals.net} EUR</strong></span>
            <span style={{ fontSize: 13 }}>{t("logistics.bgmk.gross")}: <strong className="num">{totals.gross} EUR</strong></span>
            <button className="btn btn-primary btn-sm" disabled={busy || !hdr.counterpartyId || selected.length === 0} onClick={create} style={{ marginLeft: "auto" }}>{t("logistics.bgmk.create")}</button>
          </div>
        </div>
      )}

      <Table rows={issued} dirLabel={t("logistics.bgmk.issued")} />
      <Table rows={received} dirLabel={t("logistics.bgmk.received")} />
    </div>
  );
}
