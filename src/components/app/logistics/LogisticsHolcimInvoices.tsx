"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Invoice = { id: string; number: string; date: string | null; currency: string; lines: number; unresolved: number; base: number; vat: number; total: number; mismatch: boolean };
type MatchData = {
  products: { materialCode: string; name: string; unit: string }[];
  vehicles: { registration: string; aliases: string[] }[];
  dispatchNotes: { dispatchNoteNumber: string; shipmentCode: string; truck: string | null; materialCode: string | null; quantity: number | null; unit: string | null; invoiced: boolean }[];
};
type Line = { lineNumber: string; materialCode: string; materialName: string; unit: string; quantity: string; unitPrice: string; net: string; vat: string; gross: string; dispatchNoteNumber: string; vehicleRegistration: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const normReg = (s: string) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const emptyLine = (): Line => ({ lineNumber: "", materialCode: "", materialName: "", unit: "T", quantity: "", unitPrice: "", net: "", vat: "", gross: "", dispatchNoteNumber: "", vehicleRegistration: "" });
const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export function LogisticsHolcimInvoices({ canManage }: { canManage: boolean }) {
  const t = useT();
  const [items, setItems] = useState<Invoice[]>([]);
  const [md, setMd] = useState<MatchData>({ products: [], vehicles: [], dispatchNotes: [] });
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [hdr, setHdr] = useState({ number: "", issueDate: "", taxEventDate: "", vatRate: "20", currency: "EUR", paymentMethod: "", note: "", taxBase: "", vatTotal: "", grandTotal: "" });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [pdf, setPdf] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [ri, rm] = await Promise.all([fetch("/api/logistics/supplier-invoices"), fetch("/api/logistics/supplier-invoices/matchdata")]);
    if (ri.ok) setItems(await ri.json());
    if (rm.ok) setMd(await rm.json());
  }
  useEffect(() => { load(); }, []);

  const rate = hdr.vatRate ? Number(hdr.vatRate) : 0;

  // Автоматично изчисление на нето/ДДС/бруто (с ръчна корекция, ако е въведена изрично).
  function recalc(l: Line): Line {
    const q = Number(l.quantity), p = Number(l.unitPrice);
    if (!(q > 0) || !(p >= 0)) return l;
    const net = round2(q * p);
    const vat = round2(net * rate / 100);
    return { ...l, net: String(net), vat: String(vat), gross: String(round2(net + vat)) };
  }
  function setLine(i: number, patch: Partial<Line>, auto = false) {
    setLines((ls) => ls.map((l, idx) => idx === i ? (auto ? recalc({ ...l, ...patch }) : { ...l, ...patch }) : l));
  }
  // Smart fill: при въвеждане на шифър → предложи наименование + МЕ (редактируеми).
  function onMaterialCode(i: number, code: string) {
    const p = md.products.find((x) => x.materialCode === code.trim());
    setLine(i, { materialCode: code, ...(p && !lines[i].materialName ? { materialName: p.name, unit: p.unit } : {}) });
  }

  // Match статус на реда (клиентски преглед; сървърът е меродавен).
  function matchOf(l: Line): "matched" | "review" | "unmatched" | null {
    const key = l.dispatchNoteNumber.trim();
    if (!key) return null;
    const s = md.dispatchNotes.find((d) => d.dispatchNoteNumber === key);
    if (!s) return "unmatched";
    if (s.invoiced) return "review";
    const truckBad = l.vehicleRegistration && normReg(l.vehicleRegistration) !== normReg(s.truck ?? "");
    const matBad = l.materialCode && s.materialCode && l.materialCode.trim() !== s.materialCode.trim();
    const qtyBad = l.quantity && s.quantity != null && Math.abs(Number(l.quantity) - s.quantity) > 0.001;
    return (truckBad || matBad || qtyBad) ? "review" : "matched";
  }

  const totals = useMemo(() => {
    let base = 0, vat = 0;
    for (const l of lines) {
      if (!(Number(l.quantity) > 0) || l.unitPrice === "") continue;
      const net = l.net !== "" ? Number(l.net) : round2(Number(l.quantity) * Number(l.unitPrice));
      const v = l.vat !== "" ? Number(l.vat) : round2(net * rate / 100);
      base = round2(base + net); vat = round2(vat + v);
    }
    return { base, vat, total: round2(base + vat) };
  }, [lines, rate]);
  const docTotal = hdr.grandTotal ? Number(hdr.grandTotal) : null;
  const docBase = hdr.taxBase ? Number(hdr.taxBase) : null;
  const totalsDiff = (docTotal != null && Math.abs(docTotal - totals.total) > 0.01) || (docBase != null && Math.abs(docBase - totals.base) > 0.01);

  const validLines = lines.filter((l) => Number(l.quantity) > 0 && l.unitPrice !== "");

  async function create() {
    if (validLines.length === 0) { setErr(t("logistics.holcimInv.selectAtLeastOne")); return; }
    setErr(""); setBusy(true);
    let file: unknown = null;
    if (pdf) file = { originalFilename: pdf.name, mimeType: pdf.type || "application/pdf", size: pdf.size, dataUrl: await fileToDataUrl(pdf) };
    const r = await fetch("/api/logistics/supplier-invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: hdr.number, date: hdr.issueDate ? new Date(hdr.issueDate).toISOString() : null,
        taxEventDate: hdr.taxEventDate ? new Date(hdr.taxEventDate).toISOString() : null,
        currency: hdr.currency, vatRate: hdr.vatRate ? Number(hdr.vatRate) : null, paymentMethod: hdr.paymentMethod || null, note: hdr.note || null,
        headerTaxBase: hdr.taxBase ? Number(hdr.taxBase) : null, headerVatTotal: hdr.vatTotal ? Number(hdr.vatTotal) : null, headerGrandTotal: hdr.grandTotal ? Number(hdr.grandTotal) : null,
        file,
        lines: validLines.map((l) => ({
          lineNumber: l.lineNumber ? Number(l.lineNumber) : null, materialCode: l.materialCode || null, materialName: l.materialName || null, unit: l.unit || null,
          quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), vatRate: rate,
          netAmount: l.net !== "" ? Number(l.net) : null, vatAmount: l.vat !== "" ? Number(l.vat) : null, grossAmount: l.gross !== "" ? Number(l.gross) : null,
          dispatchNoteNumber: l.dispatchNoteNumber || null, vehicleRegistration: l.vehicleRegistration || null,
        })),
      }),
    });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(j.error ?? t("logistics.common.err")); return; }
    setHdr({ number: "", issueDate: "", taxEventDate: "", vatRate: "20", currency: "EUR", paymentMethod: "", note: "", taxBase: "", vatTotal: "", grandTotal: "" });
    setLines([emptyLine()]); setPdf(null); if (fileRef.current) fileRef.current.value = ""; setOpen(false); load();
  }

  const dt = (s: string | null) => s ? new Date(s).toLocaleDateString() : "—";
  const inp = { padding: "5px 6px", fontSize: 12 } as const;
  const th = { textAlign: "left" as const, padding: "6px 6px", color: "var(--muted)", fontSize: 11, whiteSpace: "nowrap" as const };
  const td = { padding: "4px 6px", fontSize: 12, borderTop: "1px solid rgba(217,215,200,.5)" };
  const badge = (m: ReturnType<typeof matchOf>) => m === "matched" ? <span style={{ color: "var(--emerald-dark,#0F8A6A)" }}>{t("logistics.holcimInv.statusMatched")}</span>
    : m === "review" ? <span style={{ color: "var(--brass)" }}>{t("logistics.holcimInv.statusReview")}</span>
    : m === "unmatched" ? <span style={{ color: "var(--muted)" }}>{t("logistics.holcimInv.statusUnmatched")}</span> : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.holcimInv.title")}</h1>
        {canManage && <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setOpen(!open)}>{t("logistics.holcimInv.add")}</button>}
      </div>
      {err && <div style={{ color: "var(--brick)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

      <datalist id="dl-materials">{md.products.map((p) => <option key={p.materialCode} value={p.materialCode}>{p.name}</option>)}</datalist>
      <datalist id="dl-vehicles">{md.vehicles.map((v) => <option key={v.registration} value={v.registration} />)}</datalist>
      <datalist id="dl-dispatch">{md.dispatchNotes.map((d) => <option key={d.dispatchNoteNumber} value={d.dispatchNoteNumber}>{d.shipmentCode}{d.invoiced ? " ⚠" : ""}</option>)}</datalist>

      {open && canManage && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          {/* HEADER */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.number")}</label><input style={{ ...inp, width: "100%" }} value={hdr.number} onChange={(e) => setHdr({ ...hdr, number: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.issueDate")}</label><input type="date" style={{ ...inp, width: "100%" }} value={hdr.issueDate} onChange={(e) => setHdr({ ...hdr, issueDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.taxEventDate")}</label><input type="date" style={{ ...inp, width: "100%" }} value={hdr.taxEventDate} onChange={(e) => setHdr({ ...hdr, taxEventDate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.vatRate")}</label><input type="number" step="0.01" style={{ ...inp, width: "100%" }} value={hdr.vatRate} onChange={(e) => setHdr({ ...hdr, vatRate: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.currency")}</label><input style={{ ...inp, width: "100%" }} value={hdr.currency} onChange={(e) => setHdr({ ...hdr, currency: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.paymentMethod")}</label><input style={{ ...inp, width: "100%" }} value={hdr.paymentMethod} onChange={(e) => setHdr({ ...hdr, paymentMethod: e.target.value })} /></div>
            <div><label style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.pdf")}</label><input ref={fileRef} type="file" accept=".pdf,application/pdf,image/*" style={{ fontSize: 11 }} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
          </div>

          {/* LINES */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t("logistics.holcimInv.linesTitle")}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setLines((ls) => [...ls, emptyLine()])} style={{ marginLeft: "auto" }}>{t("logistics.holcimInv.addLine")}</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead><tr>
                <th style={th}>{t("logistics.holcimInv.line")}</th><th style={th}>{t("logistics.holcimInv.materialCode")}</th><th style={th}>{t("logistics.holcimInv.materialName")}</th>
                <th style={th}>{t("logistics.holcimInv.unit")}</th><th style={th}>{t("logistics.holcimInv.quantity")}</th><th style={th}>{t("logistics.holcimInv.unitPrice")}</th>
                <th style={th}>{t("logistics.holcimInv.base")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.holcimInv.total")}</th>
                <th style={th}>{t("logistics.holcimInv.dispatchNote")}</th><th style={th}>{t("logistics.holcimInv.vehicle")}</th><th style={th}>{t("logistics.holcimInv.match")}</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td style={td}><input style={{ ...inp, width: 44 }} value={l.lineNumber} onChange={(e) => setLine(i, { lineNumber: e.target.value })} /></td>
                    <td style={td}><input list="dl-materials" style={{ ...inp, width: 84 }} value={l.materialCode} onChange={(e) => onMaterialCode(i, e.target.value)} /></td>
                    <td style={td}><input style={{ ...inp, width: 170 }} value={l.materialName} onChange={(e) => setLine(i, { materialName: e.target.value })} /></td>
                    <td style={td}><input style={{ ...inp, width: 36 }} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} /></td>
                    <td style={td}><input type="number" step="0.001" style={{ ...inp, width: 72 }} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value }, true)} /></td>
                    <td style={td}><input type="number" step="0.01" style={{ ...inp, width: 64 }} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value }, true)} /></td>
                    <td style={td}><input type="number" step="0.01" style={{ ...inp, width: 76 }} value={l.net} onChange={(e) => setLine(i, { net: e.target.value })} /></td>
                    <td style={td}><input type="number" step="0.01" style={{ ...inp, width: 66 }} value={l.vat} onChange={(e) => setLine(i, { vat: e.target.value })} /></td>
                    <td style={td}><input type="number" step="0.01" style={{ ...inp, width: 76 }} value={l.gross} onChange={(e) => setLine(i, { gross: e.target.value })} /></td>
                    <td style={td}><input list="dl-dispatch" style={{ ...inp, width: 100 }} value={l.dispatchNoteNumber} onChange={(e) => setLine(i, { dispatchNoteNumber: e.target.value })} /></td>
                    <td style={td}><input list="dl-vehicles" style={{ ...inp, width: 84 }} value={l.vehicleRegistration} onChange={(e) => setLine(i, { vehicleRegistration: e.target.value })} /></td>
                    <td style={{ ...td, fontSize: 11, whiteSpace: "nowrap" }}>{badge(matchOf(l))}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <button title={t("logistics.holcimInv.dupLine")} className="btn btn-ghost btn-sm" style={{ padding: "2px 6px" }} onClick={() => setLines((ls) => [...ls.slice(0, i + 1), { ...l }, ...ls.slice(i + 1)])}>⧉</button>
                      <button title={t("logistics.holcimInv.delLine")} className="btn btn-ghost btn-sm" style={{ padding: "2px 6px", color: "var(--brick)" }} onClick={() => setLines((ls) => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLine()])}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.computedTotals")}:</span>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.base")}: <strong className="num">{totals.base}</strong></span>
            <span style={{ fontSize: 12.5 }}>{t("logistics.holcimInv.vat")}: <strong className="num">{totals.vat}</strong></span>
            <span style={{ fontSize: 13 }}>{t("logistics.holcimInv.total")}: <strong className="num">{totals.total} {hdr.currency}</strong></span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t("logistics.holcimInv.headerTotals")}:</span>
            <input style={{ ...inp, width: 100 }} value={hdr.taxBase} onChange={(e) => setHdr({ ...hdr, taxBase: e.target.value })} placeholder={t("logistics.holcimInv.base")} />
            <input style={{ ...inp, width: 90 }} value={hdr.vatTotal} onChange={(e) => setHdr({ ...hdr, vatTotal: e.target.value })} placeholder={t("logistics.holcimInv.vat")} />
            <input style={{ ...inp, width: 100 }} value={hdr.grandTotal} onChange={(e) => setHdr({ ...hdr, grandTotal: e.target.value })} placeholder={t("logistics.holcimInv.total")} />
            {(docTotal != null || docBase != null) && <span style={{ fontSize: 12, color: totalsDiff ? "var(--brass)" : "var(--emerald-dark,#0F8A6A)" }}>{totalsDiff ? `${t("logistics.holcimInv.totalsDiff")}: ${round2((docTotal ?? totals.total) - totals.total)}` : t("logistics.holcimInv.totalsMatch")}</span>}
            <button className="btn btn-primary btn-sm" disabled={busy || !hdr.number || validLines.length === 0} onClick={create} style={{ marginLeft: "auto" }}>{t("logistics.holcimInv.create")}</button>
          </div>
        </div>
      )}

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {items.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.holcimInv.empty")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.holcimInv.number")}</th><th style={th}>{t("logistics.holcimInv.date")}</th><th style={th}>{t("logistics.holcimInv.shipments")}</th>
              <th style={th}>{t("logistics.holcimInv.base")}</th><th style={th}>{t("logistics.holcimInv.vat")}</th><th style={th}>{t("logistics.holcimInv.total")}</th>
            </tr></thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id}>
                  <td style={td}><Link href={`/dashboard/logistics/holcim-invoices/${inv.id}`} style={{ fontWeight: 600 }}>{inv.number}</Link>{inv.mismatch && <span title={t("logistics.holcimInv.headerMismatch")} style={{ color: "var(--brass)", marginLeft: 6 }}>⚠</span>}</td>
                  <td style={td}>{dt(inv.date)}</td>
                  <td style={td} className="num">{inv.lines}{inv.unresolved > 0 && <span style={{ color: "var(--brass)", fontSize: 11 }}> ({inv.unresolved} {t("logistics.holcimInv.unresolved")})</span>}</td>
                  <td style={td} className="num">{inv.base} {inv.currency}</td><td style={td} className="num">{inv.vat}</td><td style={td} className="num">{inv.total} {inv.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
