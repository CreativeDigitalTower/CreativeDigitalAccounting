"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  isDualCurrencyActive, toBGN, formatCurrency, EUR_TO_BGN,
  CURRENCIES, DOC_LANGUAGES, INVOICE_TEMPLATES, PAYMENT_METHODS, allowedTemplateCount, VAT_EXEMPT_REASONS, type PlanId,
} from "@/lib/constants";
import { TemplateGallery } from "@/components/app/TemplateGallery";

type ClientFull = { id: string; name: string; eik: string | null; vatNumber: string | null; city: string | null; address: string | null; contactEmail: string | null };
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
  const [clientMode, setClientMode] = useState<"select" | "manual">("manual");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<ClientFull[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  // ръчни данни на клиента
  const [mClient, setMClient] = useState({
    name: "", eik: "", vatNumber: "", vatRegistered: false, mol: "", city: "", address: "", contactEmail: "",
  });
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("bg");
  const [template, setTemplate] = useState("classic");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0, vatRate: 20 }]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxEventDate, setTaxEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [internalComment, setInternalComment] = useState("");
  const [companyReady, setCompanyReady] = useState(true);
  const [plan, setPlan] = useState<PlanId>("free");
  // ДДС освобождаване
  const [vatExempt, setVatExempt] = useState(false);
  const [vatReasonCode, setVatReasonCode] = useState("");
  const [vatReasonCustom, setVatReasonCustom] = useState("");
  const [clientIsIndividual, setClientIsIndividual] = useState(false);
  const allowedTpls = (() => { const n = allowedTemplateCount(plan); return n === Infinity ? INVOICE_TEMPLATES : INVOICE_TEMPLATES.slice(0, n); })();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Предложения за клиент при ръчно въвеждане (по име или ЕИК)
  const suggestions = mClient.name.length >= 2 || mClient.eik.length >= 2
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(mClient.name.toLowerCase()) ||
        (mClient.eik && c.eik?.includes(mClient.eik))
      ).slice(0, 6)
    : [];

  function pickClient(c: ClientFull) {
    setMClient({
      name: c.name, eik: c.eik ?? "", vatNumber: c.vatNumber ?? "", vatRegistered: false,
      mol: "", city: c.city ?? "", address: c.address ?? "", contactEmail: c.contactEmail ?? "",
    });
    setClientId(c.id);
    setSuggestOpen(false);
  }

  useEffect(() => {
    const preselect = searchParams.get("clientId");
    fetch("/api/clients").then((r) => r.json()).then((list: ClientFull[]) => {
      setClients(list);
      // Предварителен избор на клиент (от списъка с клиенти / досие)
      if (preselect) {
        const c = list.find((x) => x.id === preselect);
        if (c) { setClientMode("manual"); pickClient(c); }
      }
    }).catch(() => {});
    // Зареди основните настройки от профила на фирмата
    fetch("/api/company").then((r) => r.json()).then((c) => {
      if (c?.defaultCurrency) setCurrency(c.defaultCurrency);
      if (c?.defaultLanguage) setLanguage(c.defaultLanguage);
      if (c?.invoiceTemplate) setTemplate(c.invoiceTemplate);
      if (c?.plan) setPlan(c.plan as PlanId);
      // ДДС по подразбиране: нерегистрирана фирма → авто освобождаване (чл.113 ал.9)
      if (c && c.vatRegistered === false) {
        setVatExempt(true);
        setVatReasonCode(c.defaultVatExemptReason || "art113_9");
        setLines((p) => p.map((l) => ({ ...l, vatRate: 0 })));
      } else if (c?.defaultVatExempt) {
        setVatExempt(true);
        setVatReasonCode(c.defaultVatExemptReason || "");
        setLines((p) => p.map((l) => ({ ...l, vatRate: 0 })));
      }
      // Изисква попълнени фирмени данни преди фактуриране
      setCompanyReady(!!(c?.name && c?.eik && c?.address));
    }).catch(() => {});
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
  const addLine = () => setLines((p) => [...p, { description: "", quantity: 1, unitPrice: 0, vatRate: vatExempt ? 0 : 20 }]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.vatRate / 100), 0);
  const total = subtotal + vat;
  const showBgn = dual && currency === "EUR";

  async function handleSave(status: "draft" | "issued" | "sent") {
    setError("");

    // Изисквай фирмени данни преди реално издаване
    if (status !== "draft" && !companyReady) {
      setError("Първо попълнете данните на вашата фирма (Профил на фирмата), за да издавате документи.");
      return;
    }

    // ДДС освобождаване — задължително основание
    const vatReason = vatReasonCode === "other" ? vatReasonCustom.trim() : vatReasonCode;
    if (vatExempt && !vatReason) {
      setError("Моля изберете основание за неначисляване на ДДС.");
      return;
    }

    // Валидация на получателя (при издаване)
    if (status !== "draft") {
      if (clientMode === "manual") {
        // За физическо лице ЕИК не е задължителен
        const req = clientIsIndividual ? [mClient.name, mClient.city, mClient.address] : [mClient.name, mClient.eik, mClient.city, mClient.address];
        if (req.some((v) => !v.trim())) {
          setError(clientIsIndividual ? "Попълнете име, град и адрес на получателя." : "Попълнете задължителните данни на клиента: име, ЕИК, град и адрес.");
          return;
        }
      } else if (!clientId) {
        setError("Изберете клиент или въведете данните ръчно.");
        return;
      }
      if (lines.some((l) => !l.description.trim() || l.quantity <= 0)) {
        setError("Всеки ред трябва да има описание и количество.");
        return;
      }
    }

    setSaving(true);
    let finalClientId: string | null = clientId || null;

    // Ръчно въведен клиент → без дублиране: първо търсим съществуващ по ЕИК или по име
    if (clientMode === "manual" && !clientId && mClient.name.trim()) {
      const eik = mClient.eik.trim();
      const nameL = mClient.name.trim().toLowerCase();
      const existing = clients.find((c) => (eik && c.eik && c.eik.trim() === eik) || c.name.trim().toLowerCase() === nameL);
      if (existing) {
        finalClientId = existing.id; // ползваме съществуващия — само сумите по фактурата се добавят към него
      } else {
        const cRes = await fetch("/api/clients", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mClient),
        });
        if (cRes.ok) finalClientId = (await cRes.json()).id;
        else { setSaving(false); setError("Грешка при запис на клиента."); return; }
      }
    }

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, number: number || undefined, clientId: finalClientId,
        issueDate, taxEventDate, dueDate, currency, language, template, paymentMethod,
        notes, internalComment, lines, status,
        vatExempt, vatExemptReason: vatExempt ? vatReason : null, clientIsIndividual,
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

      {!companyReady && (
        <div style={{ background: "var(--brass-soft)", border: "1px solid var(--brass)", color: "var(--brass)", borderRadius: 8, padding: "12px 16px", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M12 3 1.5 21h21L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg> За да издавате документи, първо попълнете данните на вашата фирма (име, ЕИК, адрес).</span>
          <Link href="/dashboard/settings" className="btn btn-primary btn-sm">Попълни сега →</Link>
        </div>
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
              {allowedTpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label>Начин на плащане</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Клиент: избор / ръчно */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: 0 }}>Получател</h3>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button type="button" className={`filter-tab${clientMode === "select" ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientMode("select")}>От списък</button>
              <button type="button" className={`filter-tab${clientMode === "manual" ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientMode("manual")}>Въведи ръчно</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button type="button" className={`filter-tab${!clientIsIndividual ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientIsIndividual(false)}>Фирма (с ЕИК/ДДС)</button>
            <button type="button" className={`filter-tab${clientIsIndividual ? " active" : ""}`} style={{ fontSize: 11.5 }} onClick={() => setClientIsIndividual(true)}>Физическо лице</button>
          </div>

          {clientMode === "select" ? (
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Изберете клиент —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1", position: "relative" }}>
                <label>Клиент / Фирма *</label>
                <input
                  type="text" value={mClient.name}
                  onChange={(e) => { setMClient({ ...mClient, name: e.target.value }); setClientId(""); setSuggestOpen(true); }}
                  onFocus={() => setSuggestOpen(true)}
                  placeholder="Започнете да пишете име или ЕИК…" autoComplete="off"
                />
                {suggestOpen && suggestions.length > 0 && (
                  <div className="glass" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
                    {suggestions.map((c) => (
                      <button key={c.id} type="button" onClick={() => pickClient(c)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "none", borderBottom: "1px solid rgba(217,215,200,.5)", cursor: "pointer", fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.eik && <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 12 }}>ЕИК {c.eik}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {clientId && <div style={{ fontSize: 11.5, color: "var(--emerald)", marginTop: 4 }}>✓ Избран съществуващ клиент — данните са попълнени автоматично.</div>}
              </div>
              {!clientIsIndividual && (
                <div>
                  <label>ЕИК / Булстат *</label>
                  <input type="text" value={mClient.eik} onChange={(e) => { setMClient({ ...mClient, eik: e.target.value }); setClientId(""); setSuggestOpen(true); }} />
                </div>
              )}
              {!clientIsIndividual && (
                <div>
                  <label>ДДС номер</label>
                  <input type="text" value={mClient.vatNumber} onChange={(e) => setMClient({ ...mClient, vatNumber: e.target.value })} placeholder="BG..." />
                </div>
              )}
              {!clientIsIndividual && (
                <div>
                  <label>Регистрация по ЗДДС</label>
                  <select value={mClient.vatRegistered ? "1" : "0"} onChange={(e) => setMClient({ ...mClient, vatRegistered: e.target.value === "1" })}>
                    <option value="0">Без ДДС регистрация</option>
                    <option value="1">Регистриран по ЗДДС</option>
                  </select>
                </div>
              )}
              <div>
                <label>МОЛ</label>
                <input type="text" value={mClient.mol} onChange={(e) => setMClient({ ...mClient, mol: e.target.value })} />
              </div>
              <div>
                <label>Град *</label>
                <input type="text" value={mClient.city} onChange={(e) => setMClient({ ...mClient, city: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Адрес *</label>
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

        {/* ДДС — неначисляване */}
        {type !== "quote" && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 20 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={vatExempt} onChange={(e) => { setVatExempt(e.target.checked); if (e.target.checked) setLines((p) => p.map((l) => ({ ...l, vatRate: 0 }))); }} style={{ width: "auto" }} />
              Не начислявай ДДС по тази фактура
            </label>
            {vatExempt && (
              <div style={{ marginTop: 10, maxWidth: 640 }}>
                <label style={{ fontSize: 12 }}>Основание за неначисляване на ДДС *</label>
                <select value={vatReasonCode} onChange={(e) => setVatReasonCode(e.target.value)}>
                  <option value="">— Изберете основание —</option>
                  {VAT_EXEMPT_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
                {vatReasonCode === "other" && (
                  <input value={vatReasonCustom} onChange={(e) => setVatReasonCustom(e.target.value)} placeholder="Въведете основание…" style={{ marginTop: 8 }} />
                )}
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                  Основанието се визуализира във фактурата под реда за ДДС. Стойността по подразбиране идва от ДДС настройките на фирмата и може да се промени само за тази фактура.
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <div>
            <label>{type === "quote" ? "Описание на офертата (видимо за клиента)" : "Забележки (видими за клиента)"}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={type === "quote" ? "Опишете какво включва офертата, обхват, условия, валидност…" : "Напр. условия, благодарност, допълнителна информация…"} />
          </div>
          <div>
            <label>Коментари (вътрешни, НЕ се виждат от клиента)</label>
            <textarea value={internalComment} onChange={(e) => setInternalComment(e.target.value)} rows={3} placeholder="Вътрешни бележки само за вашия екип…" style={{ background: "rgba(166,130,47,.06)" }} />
          </div>
        </div>

        {/* Галерия с шаблони — избор + преглед */}
        <TemplateGallery plan={plan} selected={template} onSelect={setTemplate} title="Изберете дизайн на документа" />

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
