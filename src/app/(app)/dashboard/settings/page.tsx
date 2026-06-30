"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CURRENCIES, DOC_LANGUAGES, INVOICE_TEMPLATES, allowedTemplateCount, type PlanId } from "@/lib/constants";
import { TemplatePreview } from "@/components/app/TemplatePreview";
import { BusinessProfileSettings } from "@/components/app/BusinessProfileSettings";
import { EmailPreferences } from "@/components/app/EmailPreferences";

type Company = {
  name: string; eik: string | null; vatNumber: string | null; vatRegistered: boolean;
  address: string | null; city: string | null; mol: string | null;
  phone: string | null; email: string | null; website: string | null;
  bankIban: string | null; bankName: string | null; bankBic: string | null;
  logoUrl: string | null; brandColor: string | null;
  defaultCurrency: string; defaultLanguage: string; invoiceTemplate: string;
  invoiceNumberStart: number; plan?: string;
};

export default function SettingsPage() {
  const [c, setC] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company").then((r) => r.json()).then(setC);
  }, []);

  function set<K extends keyof Company>(key: K, val: Company[K]) {
    setC((prev) => (prev ? { ...prev, [key]: val } : prev));
    setSaved(false);
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("Логото трябва да е под 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoUrl", reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!c) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, invoiceNumberStart: Number(c.invoiceNumberStart) || 1 }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Грешка при запис.");
    }
  }

  if (!c) return <div style={{ color: "var(--muted)", padding: 40 }}>Зареждане…</div>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Профил на фирмата</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Тези данни се използват върху всички издадени документи</div>
      </div>

      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {saved && <div style={{ background: "var(--emerald-soft)", border: "1px solid var(--emerald)", color: "var(--emerald)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>✓ Данните са запазени.</div>}

      <BusinessProfileSettings />

      {/* Лого + основни данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Фирмено лого</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 110, height: 110, borderRadius: 12, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.4)", overflow: "hidden" }}>
            {c.logoUrl
              ? <img src={c.logoUrl} alt="Лого" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ color: "var(--muted)", fontSize: 12 }}>Няма лого</span>}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleLogo} style={{ fontSize: 13, marginBottom: 8 }} />
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>PNG/JPG/SVG, до 500KB. Показва се във фактурите.</div>
            {c.logoUrl && <button onClick={() => set("logoUrl", null)} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>Премахни лого</button>}
          </div>
        </div>
      </div>

      {/* Основни данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Данни на фирмата</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Наименование *</label>
            <input type="text" value={c.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label>ЕИК / Булстат</label>
            <input type="text" value={c.eik ?? ""} onChange={(e) => set("eik", e.target.value)} />
          </div>
          <div>
            <label>ДДС номер</label>
            <input type="text" value={c.vatNumber ?? ""} onChange={(e) => set("vatNumber", e.target.value)} placeholder="BG205748188" />
          </div>
          <div>
            <label>Регистрация по ЗДДС</label>
            <select value={c.vatRegistered ? "1" : "0"} onChange={(e) => set("vatRegistered", e.target.value === "1")}>
              <option value="0">Без регистрация по ДДС</option>
              <option value="1">Регистрирана по ЗДДС</option>
            </select>
          </div>
          <div>
            <label>МОЛ</label>
            <input type="text" value={c.mol ?? ""} onChange={(e) => set("mol", e.target.value)} />
          </div>
          <div>
            <label>Град</label>
            <input type="text" value={c.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>Адрес</label>
            <input type="text" value={c.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label>Телефон</label>
            <input type="text" value={c.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label>Имейл</label>
            <input type="email" value={c.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label>Уебсайт</label>
            <input type="text" value={c.website ?? ""} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Банкови данни */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Банкови данни</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>IBAN</label>
            <input type="text" value={c.bankIban ?? ""} onChange={(e) => set("bankIban", e.target.value)} placeholder="BG00XXXX00000000000000" />
          </div>
          <div>
            <label>Банка</label>
            <input type="text" value={c.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} />
          </div>
          <div>
            <label>BIC / SWIFT</label>
            <input type="text" value={c.bankBic ?? ""} onChange={(e) => set("bankBic", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Настройки за документи */}
      <div className="glass panel" style={{ padding: "24px 28px", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Настройки за документи</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          <div>
            <label>Валута по подразбиране</label>
            <select value={c.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)}>
              {CURRENCIES.map((cu) => <option key={cu.code} value={cu.code}>{cu.label}</option>)}
            </select>
          </div>
          <div>
            <label>Език по подразбиране</label>
            <select value={c.defaultLanguage} onChange={(e) => set("defaultLanguage", e.target.value)}>
              {DOC_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label>Начален номер на фактурите</label>
            <input type="number" min={1} value={c.invoiceNumberStart} onChange={(e) => set("invoiceNumberStart", Number(e.target.value) as never)} />
          </div>
        </div>

        {(() => {
          const allowed = allowedTemplateCount((c.plan ?? "free") as PlanId);
          const allowedLabel = allowed === Infinity ? "всички" : `първите ${allowed}`;
          return (
            <>
              <label style={{ marginTop: 18 }}>Дизайн на фактурата — вашият план включва {allowedLabel} шаблона</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12, marginTop: 6 }}>
                {INVOICE_TEMPLATES.map((t, i) => {
                  const locked = allowed !== Infinity && i >= allowed;
                  return (
                    <div
                      key={t.id}
                      style={{
                        border: c.invoiceTemplate === t.id ? `2px solid ${t.accent}` : "1px solid var(--border)",
                        borderRadius: 10, padding: 8, background: c.invoiceTemplate === t.id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", textAlign: "left",
                        opacity: locked ? 0.55 : 1, position: "relative",
                      }}
                    >
                      <div onClick={() => !locked && set("invoiceTemplate", t.id)} style={{ cursor: locked ? "not-allowed" : "pointer" }}>
                        <TemplatePreview templateId={t.id} showLogo={!!c.logoUrl} />
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          {t.name}
                          {locked ? <span title="Заключен шаблон">🔒</span> : (c.invoiceTemplate === t.id && <span style={{ color: "var(--emerald)" }}>✓</span>)}
                        </div>
                      </div>
                      <a href={`/dashboard/settings/preview?template=${t.id}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "block", textAlign: "center", marginTop: 6, fontSize: 11.5, fontWeight: 600, color: "var(--navy)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", textDecoration: "none" }}>
                        👁 Преглед
                      </a>
                    </div>
                  );
                })}
              </div>
              {allowed !== Infinity && (
                <p style={{ fontSize: 11.5, color: "var(--brass)", marginTop: 10 }}>
                  🔒 Повече шаблони са достъпни в по-висок план. <Link href="/dashboard/subscription" style={{ color: "var(--navy)", fontWeight: 600 }}>Надгради</Link>
                </p>
              )}
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                Логото във фактурата е достъпно само за платените планове (Старт, Бизнес, Про).
              </p>
            </>
          );
        })()}
      </div>

      <EmailPreferences />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, position: "sticky", bottom: 0, padding: "12px 0" }}>
        <Link href="/dashboard" className="btn btn-ghost">Назад</Link>
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? "Записване…" : "Запази промените"}
        </button>
      </div>
    </>
  );
}
