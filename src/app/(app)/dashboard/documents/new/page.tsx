"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isDualCurrencyActive, toBGN, formatCurrency, EUR_TO_BGN } from "@/lib/constants";

type Client = { id: string; name: string; vatNumber: string | null };
type Line = { description: string; quantity: number; unitPrice: number; vatRate: number };

const DOC_TYPES = [
  { value: "invoice", label: "Фактура" },
  { value: "proforma", label: "Проформа" },
  { value: "quote", label: "Оферта" },
  { value: "credit_note", label: "Кредитно известие" },
  { value: "debit_note", label: "Дебитно известие" },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dual = isDualCurrencyActive();

  const [type, setType] = useState(searchParams.get("type") ?? "invoice");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  function updateLine(idx: number, field: keyof Line, value: string | number) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === "description" ? value : Number(value) };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;

  async function handleSave(status: "draft" | "sent") {
    setSaving(true);
    setError("");
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, clientId: clientId || null, issueDate, dueDate, notes, lines, status }),
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

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>
          ← Документи
        </Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов документ</h1>
      </div>

      {/* Document type tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            className={`filter-tab${type === t.value ? " active" : ""}`}
            onClick={() => setType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="glass panel" style={{ padding: "24px 28px" }}>
        {/* Header fields */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div>
            <label>Клиент</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Изберете клиент —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Дата на издаване</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          {type === "invoice" && (
            <div>
              <label>Срок на плащане</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
          <div>
            <label>Валута</label>
            <select disabled>
              <option value="EUR">EUR — Евро</option>
            </select>
          </div>
        </div>

        {/* Lines table */}
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
                <td>
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, "description", e.target.value)}
                    placeholder="Услуга / стока"
                    style={{ padding: "7px 8px", fontSize: 13 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={line.quantity}
                    min="0"
                    step="0.01"
                    onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                    style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={line.unitPrice}
                    min="0"
                    step="0.01"
                    onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                    style={{ padding: "7px 8px", fontSize: 13, textAlign: "right" }}
                  />
                </td>
                <td>
                  <select value={line.vatRate} onChange={(e) => updateLine(idx, "vatRate", e.target.value)} style={{ padding: "7px 8px", fontSize: 13 }}>
                    <option value={20}>20%</option>
                    <option value={9}>9%</option>
                    <option value={0}>0%</option>
                  </select>
                </td>
                <td style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 13 }}>
                  {formatCurrency(line.quantity * line.unitPrice * (1 + line.vatRate / 100))}
                </td>
                <td>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      style={{ background: "none", border: "none", color: "var(--brick)", cursor: "pointer", fontSize: 16 }}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addLine} className="add-row-btn" style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--navy)", background: "none", border: "1px dashed var(--border)", padding: "7px 12px", borderRadius: 6, width: "100%", cursor: "pointer" }}>
          + Добави ред
        </button>

        {/* Totals */}
        <div style={{ marginTop: 20, marginLeft: "auto", width: 300, borderRadius: 9, padding: "14px 16px" }} className="glass">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
            <span>Нето:</span><span className="num">{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: "var(--ink-soft)" }}>
            <span>ДДС:</span><span className="num">{formatCurrency(vat)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 10, fontSize: 17, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>Общо:</span><span>{formatCurrency(total)}</span>
          </div>
          {dual && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", paddingTop: 4 }}>
              <span>≈ BGN:</span><span>{formatCurrency(toBGN(total), "BGN")}</span>
            </div>
          )}
        </div>

        {dual && (
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12 }}>
            Двойно EUR/BGN обозначаване е задължително до 08.08.2026 г. (1 EUR = {EUR_TO_BGN} лв)
          </p>
        )}

        {/* Notes */}
        <div style={{ marginTop: 20 }}>
          <label>Бележки (незадължително)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Допълнителна информация за клиента…"
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <Link href="/dashboard/documents" className="btn btn-ghost">Отказ</Link>
          <button className="btn btn-ghost" onClick={() => handleSave("draft")} disabled={saving}>
            Запази като чернова
          </button>
          <button className="btn btn-primary" onClick={() => handleSave("sent")} disabled={saving}>
            {saving ? "Записване…" : "Издай документ"}
          </button>
        </div>
      </div>
    </>
  );
}
