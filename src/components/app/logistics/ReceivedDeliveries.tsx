"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { SearchableSelect } from "@/components/app/logistics/SearchableSelect";
import { parseQuantity } from "@/lib/i18n/format";

type MkInvoice = { id: string; number: string } | null;
type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null; deliveryTerm: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; sellerName: string | null; clientName: string | null;
  mkInvoice: MkInvoice; invoiceStatus: "uninvoiced" | "invoiced"; suggestedClientId: string | null;
};
type Kpi = { received: number; uninvoiced: number; invoiced: number; totalQuantity: number };
type Client = { id: string; name: string };

export function ReceivedDeliveries({ clients, companyName, mkVatRate, canManage }: { clients: Client[]; companyName: string; mkVatRate: number; canManage: boolean }) {
  const t = useT();
  const { qtyUnit, qty } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [status, setStatus] = useState<"all" | "uninvoiced" | "invoiced">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientF, setClientF] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "quantity" | "client" | "status">("date");
  const [modal, setModal] = useState<Row | null>(null);

  async function load() {
    const r = await fetch("/api/logistics/export-sets/received");
    if (r.ok) { const j = await r.json(); setRows(j.rows ?? []); setKpi(j.kpi ?? null); }
  }
  useEffect(() => { void load(); }, []);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status !== "all" && r.invoiceStatus !== status) return false;
      if (from && (!r.invoiceDate || r.invoiceDate.slice(0, 10) < from)) return false;
      if (to && (!r.invoiceDate || r.invoiceDate.slice(0, 10) > to)) return false;
      if (clientF && r.clientName !== clientF) return false;
      if (nq) {
        const hay = [r.invoiceNumber, r.productSnapshot, r.truckRegSnapshot, r.trailerReg, r.destination, r.clientName, r.sellerName].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
    const cmp: Record<string, (a: Row, b: Row) => number> = {
      date: (a, b) => (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? ""),
      quantity: (a, b) => (b.quantity ?? 0) - (a.quantity ?? 0),
      client: (a, b) => (a.clientName ?? "").localeCompare(b.clientName ?? ""),
      status: (a, b) => a.invoiceStatus.localeCompare(b.invoiceStatus),
    };
    return [...list].sort(cmp[sortBy]);
  }, [rows, status, from, to, clientF, q, sortBy]);

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));
  const clientNames = [...new Set(rows.map((r) => r.clientName).filter((x): x is string => !!x))].sort();

  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };
  const sel = { padding: "6px 9px", fontSize: 12.5 } as const;

  function Chip({ st }: { st: Row["invoiceStatus"] }) {
    const invoiced = st === "invoiced";
    return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: invoiced ? "rgba(15,138,106,.12)" : "rgba(178,58,42,.12)", color: invoiced ? "var(--emerald,#0f8a6a)" : "var(--brick,#b23a2a)" }}>
      {invoiced ? t("logistics.received.stInvoiced") : t("logistics.received.stUninvoiced")}
    </span>;
  }

  function Kpicard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return (
      <div className="glass panel" style={{ padding: "9px 14px", minWidth: 110 }}>
        <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'Fraunces', serif", color: warn ? "var(--brick)" : "inherit" }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "0 0 6px" }}>{t("logistics.received.title")}</h1>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("logistics.received.intro")}</p>

      {kpi && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Kpicard label={t("logistics.received.kpiReceived")} value={String(kpi.received)} />
          <Kpicard label={t("logistics.received.kpiUninvoiced")} value={String(kpi.uninvoiced)} warn={kpi.uninvoiced > 0} />
          <Kpicard label={t("logistics.received.kpiInvoiced")} value={String(kpi.invoiced)} />
          <Kpicard label={t("logistics.received.kpiTotalQty")} value={qtyUnit(kpi.totalQuantity, "t")} />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "inline-flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
          {(["all", "uninvoiced", "invoiced"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className="btn btn-sm"
              style={{ borderRadius: 0, fontSize: 12, background: status === s ? "var(--brick)" : "transparent", color: status === s ? "#fff" : "inherit" }}>
              {t(`logistics.received.filter_${s}`)}
            </button>
          ))}
        </div>
        <input style={{ ...sel, minWidth: 190 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("logistics.received.search")} />
        <label style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>{t("logistics.received.from")}
          <input type="date" style={sel} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>{t("logistics.received.to")}
          <input type="date" style={sel} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <select style={sel} value={clientF} onChange={(e) => setClientF(e.target.value)}>
          <option value="">{t("logistics.received.allClients")}</option>
          {clientNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select style={sel} value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="date">{t("logistics.received.sortDate")}</option>
          <option value="quantity">{t("logistics.received.sortQty")}</option>
          <option value="client">{t("logistics.received.sortClient")}</option>
          <option value="status">{t("logistics.received.sortStatus")}</option>
        </select>
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.received.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.received.bgInvoice")}</th><th style={th}>{t("logistics.received.date")}</th>
              <th style={th}>{t("logistics.received.truck")}</th><th style={th}>{t("logistics.received.product")}</th>
              <th style={th}>{t("logistics.received.quantity")}</th><th style={th}>{t("logistics.received.term")}</th>
              <th style={th}>{t("logistics.received.destination")}</th><th style={th}>{t("logistics.received.client")}</th>
              <th style={th}>{t("logistics.received.status")}</th><th style={th}>{t("logistics.received.mkInvoice")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={td}><Link href={`/dashboard/logistics/export/${r.id}`} style={{ fontWeight: 600 }}>{r.invoiceNumber}</Link>
                    {r.sellerName && <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{r.sellerName}</div>}</td>
                  <td style={td}>{dt(r.invoiceDate)}</td>
                  <td style={td} className="num">{[r.truckRegSnapshot, r.trailerReg].filter(Boolean).join(" / ") || "—"}</td>
                  <td style={td}>{r.productSnapshot ?? "—"}</td>
                  <td style={td} className="num">{r.quantity != null ? qtyUnit(r.quantity, r.unit) : "—"}</td>
                  <td style={td}>{r.deliveryTerm ?? "—"}</td>
                  <td style={td}>{r.destination ?? "—"}</td>
                  <td style={td}>{r.clientName ?? "—"}</td>
                  <td style={td}><Chip st={r.invoiceStatus} /></td>
                  <td style={td}>{r.mkInvoice ? <Link href={`/dashboard/logistics/mk-sales/${r.mkInvoice.id}`} style={{ fontWeight: 600 }}>{r.mkInvoice.number}</Link> : "—"}</td>
                  <td style={td}>
                    {r.mkInvoice
                      ? <Link className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} href={`/dashboard/logistics/mk-sales/${r.mkInvoice.id}`}>{t("logistics.received.openInvoice")}</Link>
                      : canManage
                        ? <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} onClick={() => setModal(r)}>{t("logistics.received.createInvoice")}</button>
                        : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && <CreateModal row={modal} clients={clientOptions} clientName={clientName} companyName={companyName} mkVatRate={mkVatRate} qty={qty}
        onClose={() => setModal(null)} onDone={() => { setModal(null); void load(); }} />}
    </div>
  );
}

function CreateModal({ row, clients, clientName, companyName, mkVatRate, qty, onClose, onDone }: {
  row: Row; clients: { value: string; label: string }[]; clientName: (id: string) => string; companyName: string; mkVatRate: number;
  qty: (v: number | null | undefined) => string; onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const [clientId, setClientId] = useState(row.suggestedClientId ?? "");
  const [quantity, setQuantity] = useState(row.quantity != null ? qty(row.quantity) : "");
  const [unitPrice, setUnitPrice] = useState("");
  const [vatRate, setVatRate] = useState(String(mkVatRate));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    const qn = parseQuantity(quantity) ?? 0;
    const up = Number(unitPrice.replace(",", "."));
    if (!clientId) { setErr(t("logistics.received.errClient")); return; }
    if (!(qn > 0)) { setErr(t("logistics.received.errQty")); return; }
    if (!(up >= 0) || unitPrice.trim() === "") { setErr(t("logistics.received.errPrice")); return; }
    setBusy(true);
    const r = await fetch(`/api/logistics/export-sets/received/${row.id}/mk-invoice`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, quantity: qn, unitPrice: up, vatRate: Number(vatRate) || 0 }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onDone();
  }

  const lbl = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 3 } as const;
  const inp = { width: "100%", padding: "7px 9px", fontSize: 13 } as const;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", padding: 20 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 4px" }}>{t("logistics.received.createTitle")}</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>{t("logistics.received.fromDelivery")} {row.invoiceNumber}</p>

        <div style={{ display: "grid", gap: 10 }}>
          <div><span style={lbl}>{t("logistics.received.seller")}</span><div style={{ fontSize: 13, fontWeight: 600 }}>{companyName}</div></div>
          <div><span style={lbl}>{t("logistics.received.buyer")} *</span>
            <SearchableSelect options={clients} value={clientId} onChange={setClientId} placeholder={t("logistics.received.pickClient")} allowEmpty={false} />
            {clientId && <span style={{ fontSize: 11, color: "var(--muted)" }}>{clientName(clientId)}</span>}
          </div>
          <div><span style={lbl}>{t("logistics.received.product")}</span><div style={{ fontSize: 13 }}>{row.productSnapshot ?? "—"}</div></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><span style={lbl}>{t("logistics.received.quantity")} ({row.unit})</span>
              <input style={inp} className="num" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div style={{ flex: 1 }}><span style={lbl}>{t("logistics.received.unitPrice")} *</span>
              <input style={inp} className="num" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" autoFocus /></div>
            <div style={{ width: 90 }}><span style={lbl}>{t("logistics.received.vat")} %</span>
              <input style={inp} className="num" value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></div>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>{t("logistics.received.priceHint")}</p>
        </div>

        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.received.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>{t("logistics.received.issue")}</button>
        </div>
      </div>
    </div>
  );
}
