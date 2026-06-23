"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  isDualCurrencyActive, toBGN, formatCurrency, EUR_TO_BGN,
  CURRENCIES, DOC_LANGUAGES, INVOICE_TEMPLATES,
} from "@/lib/constants";

type Client = { id: string; name: string; vatNumber: string | null };
type Line = { description: string; quantity: number; unitPrice: number; vatRate: number };

const DOC_TYPES = [
  { value: "invoice", label: "Фактура" },
  { value: "proforma", label: "Проформа" },
  { value: "quote", label: "Оферта" },
  { value: "credit_note", label: "Кредитно известие" },
  { value: "debit_note", label: "Дебитно известие" },
];

function NewDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dual = isDualCurrencyActive();

  const [type, setType] = useState(searchParams.get("type") ?? "invoice");
  const [number, setNumber] = useState("");
  const [clientMode, setClientMode] = useState<"select" | "manual">("select");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  // ръчни данни на клиента
  const [mClient, setMClient] = useState({
    name: "", eik: "", vatNumber: "", vatRegistered: false, mol: "", city: "", address: "", contactEmail: "",
  });
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("bg");
  const [template, setTemplate] = useState("classic");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
  }, []);

  // Зареди предложен номер при смяна на типа
  useEffect(() => {
    fetch(`/api/documents/next-number?type=${type}`)
      .then((r) => r.json())
      .then((d) => { if (d.number) setNumber(d.number); })
      .catch(() => {});
  }, [type]);

  function updateLine(idx: number, field: keyof Line, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "description" ? value : Number(value) };
      return next;
    });
  }
  const addLine = () => setLines((p) => [...p, { description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;
  const showBgn = dual && currency === "EUR";

  async function handleSave(status: "draft" | "issued" | "sent") {
    setSaving(true);
    setError("");

    let finalClientId: string | null = clientId || null;

    // Ръчно въведен клиент → създай и запиши в базата
    if (clientMode === "manual" && mClient.name.trim()) {
      const cRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mClient),
      });
      if (cRes.ok) {
        const created = await cRes.json();
        finalClientId = created.id;
      } else {
        setSaving(false);
        setError("Грешка при запис на клиента.");
        return;
      }
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, number: number || undefined, clientId: finalClientId,
        issueDate, taxEventDate, dueDate, currency, language, template, notes, lines, status,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Грешка при запис.");
    } else {
      const doc = await res.json();
      router.push(`/dashboard/documents/${doc.id}`);
    }
  }

  const curSymbol = CURRENCIES.find((c) => c.code === currency)?.code ?? currency;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Документи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов документ</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {DOC_TYPES.map((t) => (
          <button key={t.value} className={`filter-tab${type === t.value ? " active" : ""}`} onClick={() => setType(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <div className="glass panel" style={{ padding: "24px 28px" }}>
        {/* Номер + дати + валута + език */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div>
            <label>Пореден номер (редактируем)</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="0000000001" />
          </div>
          <div>
            <label>Дата на издаване</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <label>Дата на данъчно събитие</label>
            <input type="date" value={taxEventDate} onChange={(e) => setTaxEventDate(e.target.value)} />
          </div>
          {(type === "invoice" || type === "proforma") && (
            <div>
              <label>Срок за плащане</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
          <div>
            <label>Валута</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label>Език на документа</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {DOC_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label>Дизайн на фактурата</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {INVOICE_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Клиент: избор / ръчно */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: 0 }}>Получател</h3>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button type="button" className={`filter-tab${clientMode === "select" ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientMode("select")}>От списък</button>
              <button type="button" className={`filter-tab${clientMode === "manual" ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientMode("manual")}>Въведи ръчно</button>
            </div>
          </div>

          {clientMode === "select" ? (
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Изберете клиент —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Клиент / Фирма *</label>
                <input type="text" value={mClient.name} onChange={(e) => setMClient({ ...mClient, name: e.target.value })} placeholder="ЕООД Примерна" />
              </div>
              <div>
                <label>ЕИК / Булстат</label>
                <input type="text" value={mClient.eik} onChange={(e) => setMClient({ ...mClient, eik: e.target.value })} />
              </div>
              <div>
                <label>ДДС номер</label>
                <input type="text" value={mClient.vatNumber} onChange={(e) => setMClient({ ...mClient, vatNumber: e.target.value })} placeholder="BG..." />
              </div>
              <div>
                <label>Регистрация по ЗДДС</label>
                <select value={mClient.vatRegistered ? "1" : "0"} onChange={(e) => setMClient({ ...mClient, vatRegistered: e.target.value === "1" })}>
                  <option value="0">Без ДДС регистрация</option>
                  <option value="1">Регистриран по ЗДДС</option>
                </select>
              </div>
              <div>
                <label>МОЛ</label>
                <input type="text" value={mClient.mol} onChange={(e) => setMClient({ ...mClient, mol: e.target.value })} />
              </div>
              <div>
                <label>Град</label>
                <input type="text" value={mClient.city} onChange={(e) => setMClient({ ...mClient, city: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Адрес</label>
                <input type="text" value={mClient.address} onChange={(e) => setMClient({ ...mClient, address: e.target.value })} />
              </div>
              <div>
                <label>Имейл</label>
                <input type="email" value={mClient.contactEmail} onChange={(e) => setMClient({ ...mClient, contactEmail: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1", fontSize: 11.5, color: "var(--muted)" }}>
                ℹ Въведеният клиент ще бъде записан автоматично в списъка с клиенти на фирмата.
              </div>
            </div>
          )}
        </div>

        {/* Редове */}
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, marginBottom: 12 }}>Редове</h3>
        <table className="lines-table" style={{ marginBottom: 10 }}>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Описание</th>
              <th className="num" style={{ width: "10%" }}>Кол.</th>
              <th className="num" style={{ width: "15%" }}>Ед. цена</th>
              <th className="num" style={{ width: "12%" }}>ДДС %</th>
              <th className="num" style={{ width: "15%" }}>Сума</th>
              <th style={{ width: "8%" }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td><input type="text" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Услуга / стока" style={{ padding: "7px 8px", fontSize: 13 }} /></td>
                <td><input type="number" value={line.quantity} min="0" step="0.01" onChange={(e) => updateLine(idx, "quantity", e.target.value)} style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }} /></td>
                <td><input type="number" value={line.unitPrice} min="0" step="0.01" onChange={(e) => updateLine(idx, "unitPrice", e.target.value)} style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }} /></td>
                <td>
                  <select value={line.vatRate} onChange={(e) => updateLine(idx, "vatRate", e.target.value)} style={{ padding: "7px 8px", fontSize: 13 }}>
                    <option value={20}>20%</option>
                    <option value={9}>9%</option>
                    <option value={0}>0%</option>
                  </select>
                </td>
                <td style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 13 }}>
                  {formatCurrency(line.quantity * line.unitPrice * (1 + line.vatRate / 100), currency)}
                </td>
                <td>{lines.length > 1 && <button onClick={() => removeLine(idx)} style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}>×</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addLine} style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, width: "100%", cursor: "pointer" }}>
          + Добави ред
        </button>

        {/* Тотали */}
        <div className="glass" style={{ marginTop: 20, marginLeft: "auto", width: 300, borderRadius: 9, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
            <span>Нето:</span><span className="num">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
            <span>ДДС:</span><span className="num">{formatCurrency(vat, currency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10, fontSize: 17, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>Общо:</span><span>{formatCurrency(total, currency)}</span>
          </div>
          {showBgn && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 4 }}>
              <span>≈ BGN:</span><span>{formatCurrency(toBGN(total), "BGN")}</span>
            </div>
          )}
        </div>

        {showBgn && (
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>
            Двойно EUR/BGN обозначаване е задължително до 08.08.2026 г. (1 EUR = {EUR_TO_BGN} лв)
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <label>Бележки (незадължително)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Допълнителна информация за клиента…" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/dashboard/documents" className="btn btn-ghost">Отказ</Link>
          <button className="btn btn-ghost" onClick={() => handleSave("draft")} disabled={saving}>Запази като чернова</button>
          <button className="btn btn-primary" onClick={() => handleSave("issued")} disabled={saving}>
            {saving ? "Записване…" : "Издай документ"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense>
      <NewDocumentForm />
    </Suspense>
  );
}
