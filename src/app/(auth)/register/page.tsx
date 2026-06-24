"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const PLANS = [
  { id: "free", name: "Безплатен", price: "0 €" },
  { id: "start", name: "Старт", price: "9 €/мес" },
  { id: "business", name: "Бизнес", price: "29 €/мес" },
  { id: "pro", name: "Про", price: "59 €/мес" },
];

const SECTORS = ["Търговия", "Услуги", "Производство", "IT / Софтуер", "Строителство", "Транспорт", "Туризъм / Ресторантьорство", "Земеделие", "Здравеопазване", "Образование", "Финанси", "Свободна професия", "Друг"];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [plan, setPlan] = useState(params.get("plan") ?? "free");
  const [step, setStep] = useState<"account" | "company">("account");
  const [acc, setAcc] = useState({ name: "", representativeRole: "", email: "", email2: "", password: "", password2: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function nextStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (acc.email !== acc.email2) { setError("Имейлите не съвпадат."); return; }
    if (acc.password !== acc.password2) { setError("Паролите не съвпадат."); return; }
    if (acc.password.length < 8) { setError("Паролата трябва да е поне 8 символа."); return; }
    setStep("company");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (!fd.get("acceptTerms")) { setLoading(false); setError("Трябва да приемете Общите условия и Политиката за поверителност."); return; }

    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: acc.name, email: acc.email, password: acc.password, representativeRole: acc.representativeRole,
        companyName: fd.get("companyName"), eik: fd.get("eik"), vatNumber: fd.get("vatNumber") || undefined,
        address: fd.get("address") || undefined, city: fd.get("city") || undefined, mol: fd.get("mol") || undefined,
        sector: fd.get("sector") || undefined, plan,
        acceptTerms: true, marketingConsent: !!fd.get("marketingConsent"),
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/login?registered=1");
    else setError((await res.json()).error ?? "Грешка при регистрацията.");
  }

  return (
    <div style={{ width: "100%", maxWidth: 520 }}>
      <div className="glass panel" style={{ padding: "36px 34px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: step === "account" ? "var(--emerald)" : "var(--muted)" }}>1. Акаунт</span>
          <span style={{ color: "var(--border)" }}>→</span>
          <span style={{ color: step === "company" ? "var(--emerald)" : "var(--muted)" }}>2. Фирма и план</span>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>
          {step === "account" ? "Създай акаунт" : "Данни на фирмата"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 22px" }}>
          {step === "account" ? "Въведете личните си данни за вход" : "Тези данни се ползват за издаване на фактури"}
        </p>

        {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {step === "account" ? (
          <form onSubmit={nextStep} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div><label>Вашите имена *</label><input type="text" required value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} placeholder="Иван Иванов" /></div>
            <div><label>Качество (представител на фирмата) *</label>
              <select required value={acc.representativeRole} onChange={(e) => setAcc({ ...acc, representativeRole: e.target.value })}>
                <option value="" disabled>Изберете</option>
                {["Собственик / Управител", "Счетоводител", "Финансов директор", "Служител", "Упълномощено лице", "Друго"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Имейл *</label><input type="email" required value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} /></div>
              <div><label>Потвърди имейл *</label><input type="email" required value={acc.email2} onChange={(e) => setAcc({ ...acc, email2: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Парола *</label><input type="password" required minLength={8} value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} /></div>
              <div><label>Потвърди парола *</label><input type="password" required minLength={8} value={acc.password2} onChange={(e) => setAcc({ ...acc, password2: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Следваща стъпка →</button>
          </form>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Наименование на фирмата *</label><input type="text" name="companyName" required placeholder="ЕООД Примерна" /></div>
              <div><label>ЕИК / Булстат *</label><input type="text" name="eik" required /></div>
              <div><label>ДДС номер</label><input type="text" name="vatNumber" placeholder="BG..." /></div>
              <div><label>МОЛ</label><input type="text" name="mol" /></div>
              <div><label>Град</label><input type="text" name="city" /></div>
              <div><label>Сектор на дейност</label>
                <select name="sector" defaultValue=""><option value="">Изберете</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label>Адрес на регистрация</label><input type="text" name="address" /></div>
            </div>

            <div>
              <label>Абонаментен план</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: 4 }}>
                {PLANS.map((p) => (
                  <button type="button" key={p.id} onClick={() => setPlan(p.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: plan === p.id ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: plan === p.id ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, fontSize: 12.5, marginTop: 4 }}>
              <input type="checkbox" name="acceptTerms" style={{ width: "auto", marginTop: 2 }} />
              <span>Прочетох и приемам <Link href="/terms" target="_blank" style={{ color: "var(--navy)", fontWeight: 600 }}>Общите условия</Link> и <Link href="/privacy" target="_blank" style={{ color: "var(--navy)", fontWeight: 600 }}>Политиката за поверителност</Link>. *</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, fontSize: 12.5 }}>
              <input type="checkbox" name="marketingConsent" style={{ width: "auto", marginTop: 2 }} />
              <span>Съгласен/на съм да получавам имейли и известия от Creative Digital Accounting.</span>
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("account")} style={{ justifyContent: "center" }}>← Назад</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>{loading ? "Регистрация…" : "Завърши регистрацията"}</button>
            </div>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
          Вече имате акаунт? <Link href="/login" style={{ color: "var(--navy)", fontWeight: 600 }}>Вход</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
