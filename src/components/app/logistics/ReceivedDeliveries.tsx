"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useI18n } from "@/components/i18n/I18nProvider";
import { DateField } from "@/components/app/logistics/DateField";

// „document" = стандартна фактура (Document); „mk" = легаси MkInvoice (detail route се
// различава).
type MkInvoice = { id: string; number: string; kind?: "document" | "mk" } | null;
type Row = {
  id: string; invoiceNumber: string; invoiceDate: string | null; destination: string | null; deliveryTerm: string | null;
  truckRegSnapshot: string | null; trailerReg: string | null; productSnapshot: string | null;
  quantity: number | null; unit: string; status: string; sellerName: string | null; clientName: string | null;
  mkInvoice: MkInvoice; invoiceStatus: "uninvoiced" | "invoiced"; suggestedClientId: string | null;
  finalClientId: string | null; bulkEligible: boolean;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
type Kpi = { received: number; uninvoiced: number; invoiced: number; totalQuantity: number };

// Линк към detail-а на издадената фактура — стандартна (Document) или легаси (MkInvoice).
function invoiceHref(inv: NonNullable<MkInvoice>): string {
  return inv.kind === "mk" ? `/dashboard/logistics/mk-sales/${inv.id}` : `/dashboard/documents/${inv.id}`;
}

export function ReceivedDeliveries({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [status, setStatus] = useState<"all" | "uninvoiced" | "invoiced">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientF, setClientF] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "quantity" | "client" | "status">("date");
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  async function load() {
    const r = await fetch("/api/logistics/export-sets/received");
    if (r.ok) { const j = await r.json(); setRows(j.rows ?? []); setKpi(j.kpi ?? null); }
  }
  useEffect(() => { void load(); }, []);

  const dt = (x: string | null) => x ? new Date(x).toLocaleDateString() : "—";

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

  const clientNames = [...new Set(rows.map((r) => r.clientName).filter((x): x is string => !!x))].sort();

  // ── Multi-select / bulk invoicing (§2/§3) ──
  const selRows = filtered.filter((r) => selIds.has(r.id));
  // Клиентът на селекцията = финалният клиент на първата избрана (hard rule anchor, §3).
  const selectionClientId = selRows[0]?.finalClientId ?? null;
  const selectionClientName = selRows[0]?.clientName ?? null;
  const selTotalQty = round2(selRows.reduce((a, r) => a + (r.quantity ?? 0), 0) * 1000) / 1000;
  // Ред е избираем, ако е bulk-eligible И (няма селекция ИЛИ е същият краен клиент, §3/§18).
  const canSelect = (r: Row) => r.bulkEligible && (selectionClientId == null || r.finalClientId === selectionClientId);
  function toggleSel(r: Row) {
    if (!canSelect(r) && !selIds.has(r.id)) return;
    setSelIds((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; });
  }
  // Header: избира всички видими eligible редове на ЕДИН клиент (на първия видим eligible, §18).
  const headerAnchor = filtered.find((r) => r.bulkEligible)?.finalClientId ?? null;
  const headerTargets = filtered.filter((r) => r.bulkEligible && r.finalClientId === (selectionClientId ?? headerAnchor));
  const allHeaderSelected = headerTargets.length > 0 && headerTargets.every((r) => selIds.has(r.id));
  function toggleHeader() {
    setSelIds((prev) => { if (allHeaderSelected) return new Set(); const n = new Set(prev); headerTargets.forEach((r) => n.add(r.id)); return n; });
  }
  function clearSel() { setSelIds(new Set()); }

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
          <DateField value={from} onChange={setFrom} style={{ ...sel, minWidth: 120 }} /></label>
        <label style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>{t("logistics.received.to")}
          <DateField value={to} onChange={setTo} style={{ ...sel, minWidth: 120 }} /></label>
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
              {canManage && <th style={{ ...th, width: 28 }}><input type="checkbox" checked={allHeaderSelected} disabled={headerTargets.length === 0} onChange={toggleHeader} aria-label={t("logistics.received.bulkSelectAll")} /></th>}
              <th style={th}>{t("logistics.received.bgInvoice")}</th><th style={th}>{t("logistics.received.date")}</th>
              <th style={th}>{t("logistics.received.truck")}</th><th style={th}>{t("logistics.received.product")}</th>
              <th style={th}>{t("logistics.received.quantity")}</th><th style={th}>{t("logistics.received.term")}</th>
              <th style={th}>{t("logistics.received.destination")}</th><th style={th}>{t("logistics.received.client")}</th>
              <th style={th}>{t("logistics.received.status")}</th><th style={th}>{t("logistics.received.mkInvoice")}</th><th style={th} />
            </tr></thead>
            <tbody>
              {filtered.map((r) => {
                const disabled = !canSelect(r) && !selIds.has(r.id);
                return (
                <tr key={r.id} style={disabled && r.bulkEligible ? { opacity: 0.5 } : undefined}>
                  {canManage && <td style={td}>
                    {r.bulkEligible
                      ? <input type="checkbox" checked={selIds.has(r.id)} disabled={disabled} onChange={() => toggleSel(r)}
                          title={disabled ? t("logistics.received.bulkSameClient") : r.invoiceNumber} aria-label={r.invoiceNumber} />
                      : null}
                  </td>}
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
                  <td style={td}>{r.mkInvoice ? <Link href={invoiceHref(r.mkInvoice)} style={{ fontWeight: 600 }}>{r.mkInvoice.number}</Link> : "—"}</td>
                  <td style={td}>
                    {r.mkInvoice
                      ? <Link className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} href={invoiceHref(r.mkInvoice)}>{t("logistics.received.openInvoice")}</Link>
                      : canManage
                        ? <Link className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "2px 10px" }} href={`/dashboard/documents/new?fromDelivery=${r.id}`}>{t("logistics.received.createInvoice")}</Link>
                        : <span style={{ fontSize: 11, color: "var(--muted)" }}>—</span>}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk action bar (§5/§17/§24) — selection → отделен action + preview. */}
      {canManage && selIds.size > 0 && (
        <div className="glass panel" style={{ position: "sticky", bottom: 12, display: "flex", alignItems: "center", gap: 14, marginTop: 12, padding: "10px 16px", flexWrap: "wrap", boxShadow: "0 6px 24px rgba(0,0,0,.12)" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("logistics.received.bulkSelected", { n: selIds.size })}</span>
          {selectionClientName && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>· {selectionClientName}</span>}
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>· {qtyUnit(selTotalQty, "t")}</span>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setBulkOpen(true)}>{t("logistics.received.bulkCreate")}</button>
          <button className="btn btn-ghost btn-sm" onClick={clearSel}>{t("logistics.received.bulkClear")}</button>
        </div>
      )}

      {bulkOpen && selectionClientId && (
        <BulkInvoiceModal
          rows={selRows} clientId={selectionClientId} clientName={selectionClientName}
          onClose={() => setBulkOpen(false)}
          onDone={(docId) => { setBulkOpen(false); clearSel(); if (docId) router.push(`/dashboard/documents/${docId}`); else load(); }}
        />
      )}
    </div>
  );
}

// ── Preview + издаване на обща MK фактура (§6/§24) ──
function BulkInvoiceModal({ rows, clientId, clientName, onClose, onDone }: {
  rows: Row[]; clientId: string; clientName: string | null; onClose: () => void; onDone: (docId?: string) => void;
}) {
  const t = useT();
  const { qtyUnit } = useI18n();
  const [currency, setCurrency] = useState("MKD");
  const [vatRate, setVatRate] = useState("18");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const rate = vatRate === "" ? 0 : Number(vatRate);
  const lines = rows.map((r) => {
    const up = prices[r.id] === "" || prices[r.id] == null ? NaN : Number(prices[r.id]);
    const qty = r.quantity ?? 0;
    const net = Number.isNaN(up) ? 0 : round2(qty * up);
    return { r, up, qty, net };
  });
  const subtotal = round2(lines.reduce((a, l) => a + l.net, 0));
  const vat = round2(subtotal * rate / 100);
  const total = round2(subtotal + vat);
  const allPriced = lines.every((l) => !Number.isNaN(l.up) && l.up >= 0);

  async function submit() {
    if (!allPriced) { setErr(t("logistics.received.bulkNeedPrices")); return; }
    setErr(""); setBusy(true);
    const r = await fetch("/api/logistics/export-sets/received/bulk-invoice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, currency, vatRate: rate, lines: rows.map((row) => ({ exportSetId: row.id, unitPrice: Number(prices[row.id]) })) }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    onDone(j.id);
  }

  const inp = { padding: "5px 8px", fontSize: 12.5 } as const;
  const th = { textAlign: "left" as const, padding: "6px 8px", color: "var(--muted)", fontSize: 11.5 };
  const td = { padding: "6px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,30,25,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="glass panel" style={{ maxWidth: 820, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--paper)" }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 4px" }}>{t("logistics.received.bulkTitle")}</h3>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>{t("logistics.received.client")}: <strong>{clientName ?? "—"}</strong> · {rows.length} {t("logistics.received.bulkDeliveries")}</div>
        {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.currency")}<br /><input style={{ ...inp, width: 90 }} value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          <label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.vatRate")}<br /><input type="number" step="0.01" style={{ ...inp, width: 80 }} value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></label>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.received.bgInvoice")}</th><th style={th}>{t("logistics.received.product")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.received.quantity")}</th><th style={{ ...th, textAlign: "right" }}>{t("logistics.received.unitPrice")}</th>
              <th style={{ ...th, textAlign: "right" }}>{t("logistics.received.amount")}</th>
            </tr></thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.r.id}>
                  <td style={td}>{l.r.invoiceNumber}</td>
                  <td style={td}>{l.r.productSnapshot ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{qtyUnit(l.qty, l.r.unit)}</td>
                  <td style={{ ...td, textAlign: "right" }}><input type="number" step="0.01" min={0} style={{ ...inp, width: 90, textAlign: "right" }} value={prices[l.r.id] ?? ""} onChange={(e) => setPrices((p) => ({ ...p, [l.r.id]: e.target.value }))} /></td>
                  <td style={{ ...td, textAlign: "right" }} className="num">{Number.isNaN(l.up) ? "—" : `${l.net.toFixed(2)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 12, fontSize: 13 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--muted)" }}>{t("logistics.received.subtotal")}: <strong className="num">{subtotal.toFixed(2)} {currency}</strong></div>
            <div style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.vat")}: <strong className="num">{vat.toFixed(2)} {currency}</strong></div>
            <div style={{ fontSize: 15 }}>{t("logistics.received.grandTotal")}: <strong className="num">{total.toFixed(2)} {currency}</strong></div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>{t("logistics.common.cancel")}</button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy || !allPriced}>{t("logistics.received.bulkIssue")}</button>
        </div>
      </div>
    </div>
  );
}
