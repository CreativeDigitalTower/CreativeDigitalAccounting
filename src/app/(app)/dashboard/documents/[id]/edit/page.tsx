"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CURRENCIES, DOC_LANGUAGES, INVOICE_TEMPLATES, PAYMENT_METHODS, formatCurrency, VAT_EXEMPT_REASONS } from "@/lib/constants";

type Line = { description: string; quantity: number; unitPrice: number; vatRate: number };
type ClientFields = { name: string; eik: string; vatNumber: string; mol: string; city: string; address: string; contactEmail: string; phone: string };
const EMPTY_CLIENT: ClientFields = { name: "", eik: "", vatNumber: "", mol: "", city: "", address: "", contactEmail: "", phone: "" };

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [taxEventDate, setTaxEventDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("bg");
  const [template, setTemplate] = useState("classic");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [notes, setNotes] = useState("");
  const [internalComment, setInternalComment] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [cf, setCf] = useState<ClientFields>(EMPTY_CLIENT);
  const [vatExempt, setVatExempt] = useState(false);
  const [vatReasonCode, setVatReasonCode] = useState("");
  const [vatReasonCustom, setVatReasonCustom] = useState("");
  const [clientIsIndividual, setClientIsIndividual] = useState(false);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/documents/${id}`).then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); return; }
      setNumber(d.number);
      setIssueDate(d.issueDate?.slice(0, 10) ?? "");
      setTaxEventDate(d.taxEventDate?.slice(0, 10) ?? "");
      setDueDate(d.dueDate?.slice(0, 10) ?? "");
      setCurrency(d.currency); setLanguage(d.language); setTemplate(d.template);
      setPaymentMethod(d.paymentMethod ?? "bank_transfer");
      setNotes(d.notes ?? ""); setInternalComment(d.internalComment ?? "");
      setClientId(d.clientId ?? null);
      if (d.client) setCf({ name: d.client.name ?? "", eik: d.client.eik ?? "", vatNumber: d.client.vatNumber ?? "", mol: d.client.mol ?? "", city: d.client.city ?? "", address: d.client.address ?? "", contactEmail: d.client.contactEmail ?? "", phone: d.client.phone ?? "" });
      setVatExempt(!!d.vatExempt);
      setClientIsIndividual(!!d.clientIsIndividual);
      const code = d.vatExemptReason ?? "";
      if (code && VAT_EXEMPT_REASONS.some((r) => r.code === code)) setVatReasonCode(code);
      else if (code) { setVatReasonCode("other"); setVatReasonCustom(code); }
      setLines(d.lines.map((l: Line) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate })));
      setLoaded(true);
    });
  }, [id]);

  function setC<K extends keyof ClientFields>(k: K, v: string) { setCf((p) => ({ ...p, [k]: v })); }

  function updateLine(i: number, f: keyof Line, v: string | number) {
    setLines((p) => { const n = [...p]; n[i] = { ...n[i], [f]: f === "description" ? v : Number(v) }; return n; });
  }
  const addLine = () => setLines((p) => [...p, { description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, x) => x !== i));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.vatRate / 100), 0);

  async function save() {
    setSaving(true); setError("");
    const vatReason = vatReasonCode === "other" ? vatReasonCustom.trim() : vatReasonCode;
    if (vatExempt && !vatReason) { setSaving(false); setError("Моля изберете основание за неначисляване на ДДС."); return; }

    // Обновяване на данните на получателя (клиента), ако е свързан
    if (clientId && cf.name.trim()) {
      await fetch(`/api/clients/${clientId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cf.name, eik: cf.eik || null, vatNumber: cf.vatNumber || null, mol: cf.mol || null, city: cf.city || null, address: cf.address || null, contactEmail: cf.contactEmail || "", phone: cf.phone || null }),
      }).catch(() => {});
    }

    const res = await fetch(`/api/documents/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, clientId, issueDate, taxEventDate, dueDate, currency, language, template, paymentMethod, notes, internalComment, lines, vatExempt, vatExemptReason: vatExempt ? vatReason : null, clientIsIndividual }),
    });
    setSaving(false);
    if (res.ok) router.push(`/dashboard/documents/${id}`);
    else setError((await res.json()).error ?? "Грешка при запис.");
  }

  if (!loaded && !error) return <div style={{ color: "var(--muted)", padding: 40 }}>Зареждане…</div>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href={`/dashboard/documents/${id}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Документ</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Редакция на документ</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div className="glass panel" style={{ padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div><label>Номер</label><input value={number} onChange={(e) => setNumber(e.target.value)} /></div>
          <div><label>Дата на издаване</label><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
          <div><label>Данъчно събитие</label><input type="date" value={taxEventDate} onChange={(e) => setTaxEventDate(e.target.value)} /></div>
          <div><label>Срок за плащане</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div><label>Валута</label><select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
          <div><label>Език</label><select value={language} onChange={(e) => setLanguage(e.target.value)}>{DOC_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select></div>
          <div><label>Дизайн</label><select value={template} onChange={(e) => setTemplate(e.target.value)}>{INVOICE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><label>Начин на плащане</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
        </div>

        {/* Получател — избор + редакция на данните */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: 0 }}>Получател</h3>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button type="button" className={`filter-tab${!clientIsIndividual ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientIsIndividual(false)}>Фирма</button>
              <button type="button" className={`filter-tab${clientIsIndividual ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientIsIndividual(true)}>Физическо лице</button>
            </div>
          </div>
          <label style={{ fontSize: 12 }}>Свързан клиент</label>
          <select value={clientId ?? ""} onChange={(e) => { const cid = e.target.value || null; setClientId(cid); const sel = clients.find((c) => c.id === cid); if (sel) setC("name", sel.name); }} style={{ marginBottom: 12 }}>
            <option value="">— Без свързан клиент —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Наименование / Име</label><input value={cf.name} onChange={(e) => setC("name", e.target.value)} /></div>
            {!clientIsIndividual && <div><label style={{ fontSize: 12 }}>ЕИК</label><input value={cf.eik} onChange={(e) => setC("eik", e.target.value)} /></div>}
            {!clientIsIndividual && <div><label style={{ fontSize: 12 }}>ДДС №</label><input value={cf.vatNumber} onChange={(e) => setC("vatNumber", e.target.value)} /></div>}
            <div><label style={{ fontSize: 12 }}>МОЛ</label><input value={cf.mol} onChange={(e) => setC("mol", e.target.value)} /></div>
            <div><label style={{ fontSize: 12 }}>Град</label><input value={cf.city} onChange={(e) => setC("city", e.target.value)} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Адрес</label><input value={cf.address} onChange={(e) => setC("address", e.target.value)} /></div>
            <div><label style={{ fontSize: 12 }}>Имейл</label><input value={cf.contactEmail} onChange={(e) => setC("contactEmail", e.target.value)} /></div>
            <div><label style={{ fontSize: 12 }}>Телефон</label><input value={cf.phone} onChange={(e) => setC("phone", e.target.value)} /></div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>Промените по данните на получателя се записват и в клиентското досие.</div>
        </div>

        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, marginBottom: 12 }}>Редове</h3>
        <table className="lines-table" style={{ marginBottom: 10 }}>
          <thead><tr><th>Описание</th><th className="num">Кол.</th><th className="num">Ед. цена</th><th className="num">ДДС %</th><th></th></tr></thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td><input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} style={{ padding: "7px 8px", fontSize: 13 }} /></td>
                <td><input type="number" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }} /></td>
                <td><input type="number" value={line.unitPrice} onChange={(e) => updateLine(i, "unitPrice", e.target.value)} style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }} /></td>
                <td><select value={line.vatRate} onChange={(e) => updateLine(i, "vatRate", e.target.value)} style={{ padding: "7px 8px", fontSize: 13 }}><option value={20}>20%</option><option value={9}>9%</option><option value={0}>0%</option></select></td>
                <td>{lines.length > 1 && <button onClick={() => removeLine(i)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, width: "100%", cursor: "pointer" }}>+ Добави ред</button>

        <div style={{ textAlign: "right", marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 16 }}>Общо: {formatCurrency(total, currency)}</div>

        {/* ДДС — неначисляване */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 18 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600, cursor: "pointer" }}>
            <input type="checkbox" checked={vatExempt} onChange={(e) => { setVatExempt(e.target.checked); if (e.target.checked) setLines((p) => p.map((l) => ({ ...l, vatRate: 0 }))); }} style={{ width: "auto" }} /> Не начислявай ДДС по тази фактура
          </label>
          {vatExempt && (
            <div style={{ marginTop: 10, maxWidth: 640 }}>
              <label style={{ fontSize: 12 }}>Основание за неначисляване на ДДС *</label>
              <select value={vatReasonCode} onChange={(e) => setVatReasonCode(e.target.value)}>
                <option value="">— Изберете основание —</option>
                {VAT_EXEMPT_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
              {vatReasonCode === "other" && <input value={vatReasonCustom} onChange={(e) => setVatReasonCustom(e.target.value)} placeholder="Въведете основание…" style={{ marginTop: 8 }} />}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <div><label>Забележки (видими за клиента)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
          <div><label>Коментари (вътрешни)</label><textarea value={internalComment} onChange={(e) => setInternalComment(e.target.value)} rows={3} style={{ background: "rgba(166,130,47,.06)" }} /></div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <Link href={`/dashboard/documents/${id}`} className="btn btn-ghost">Отказ</Link>
          <button onClick={save} className="btn btn-primary" disabled={saving}>{saving ? "Записване…" : "Запази промените"}</button>
        </div>
      </div>
    </>
  );
}
