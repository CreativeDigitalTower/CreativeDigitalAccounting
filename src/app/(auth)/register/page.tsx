"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { metaTrack } from "@/lib/metaClient";
import { PLAN_DETAILS, BILLING_PERIODS } from "@/components/marketing/Pricing";
import { EUR_TO_BGN, isPromoActive, ACCOUNTANT_PLANS } from "@/lib/constants";
import { validateEik } from "@/lib/validation/eik";

const SECTORS = ["Търговия", "Услуги", "Производство", "IT / Софтуер", "Строителство", "Транспорт", "Туризъм / Ресторантьорство", "Земеделие", "Здравеопазване", "Образование", "Финанси", "Свободна професия", "Друг"];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [accountType, setAccountType] = useState<"business" | "accounting">(params.get("accountType") === "accounting" ? "accounting" : "business");
  const [plan, setPlan] = useState(params.get("plan") ?? "free");
  const [firmPlan, setFirmPlan] = useState(params.get("firmPlan") ?? "acc_pro");
  const [period, setPeriod] = useState(
    BILLING_PERIODS.find((p) => p.id === params.get("period")) ?? BILLING_PERIODS[0]
  );
  const [step, setStep] = useState<"account" | "company">("account");
  const promo = isPromoActive();
  const [acc, setAcc] = useState({ name: "", representativeRole: "", email: "", email2: "", password: "", password2: "" });
  const [eik, setEik] = useState("");
  const [eikErr, setEikErr] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function checkEik() {
    const r = validateEik(eik);
    setEikErr(r.isValid ? "" : (r.error ?? "Невалиден ЕИК/БУЛСТАТ."));
    return r;
  }

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

    // Валидация на ЕИК/БУЛСТАT преди изпращане
    const eikCheck = checkEik();
    if (!eikCheck.isValid) { setLoading(false); setError(eikCheck.error ?? "Невалиден ЕИК/БУЛСТАТ."); return; }
    if (vatRegistered && !vatNumber.trim()) { setLoading(false); setError("При регистрация по ЗДДС е задължителен ДДС номер."); return; }

    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: acc.name, email: acc.email, password: acc.password, representativeRole: acc.representativeRole,
        companyName: fd.get("companyName"), eik: eikCheck.normalized, phone: companyPhone || undefined,
        vatRegistered, vatNumber: vatNumber.trim() || undefined,
        address: fd.get("address") || undefined, city: fd.get("city") || undefined, mol: fd.get("mol") || undefined,
        sector: fd.get("sector") || undefined, plan,
        accountType, firmPlan: accountType === "accounting" ? firmPlan : undefined,
        partner: params.get("partner") || undefined,
        referralSource: params.get("ref") || undefined,
        acceptTerms: true, marketingConsent: !!fd.get("marketingConsent"),
      }),
    });
    if (res.ok) {
      // ─── Meta: регистрация ───
      try {
        const data = await res.clone().json().catch(() => ({}));
        const [firstName, ...rest] = acc.name.trim().split(" ");
        const user = { email: acc.email, firstName, lastName: rest.join(" "), externalId: data?.companyId };
        metaTrack("CompleteRegistration", { content_name: "Registration", plan_name: plan }, { user });
        metaTrack("UserRegistered", { plan_name: plan }, { user });
        metaTrack("Lead", { content_name: "Registration" }, { user });
      } catch { /* tracking не бива да чупи регистрацията */ }

      // Автоматичен вход след успешна регистрация
      const login = await signIn("credentials", { email: acc.email, password: acc.password, redirect: false });
      setLoading(false);
      if (login?.error) router.push("/login?registered=1");
      else router.push(accountType === "accounting" ? "/firm" : "/dashboard");
    } else {
      setLoading(false);
      setError((await res.json()).error ?? "Грешка при регистрацията.");
    }
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
            <div>
              <label>Тип на профила *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                {([
                  { id: "business", title: "Фирма", desc: "За вашия собствен бизнес" },
                  { id: "accounting", title: "Счетоводна къща", desc: "Управлявайте няколко клиентски фирми" },
                ] as const).map((t) => {
                  const active = accountType === t.id;
                  return (
                    <button type="button" key={t.id} onClick={() => setAccountType(t.id)}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        background: active ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: active ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, fontFamily: "'Fraunces', serif" }}>{t.title}{active && <span style={{ color: "var(--emerald)", marginLeft: 6 }}>✓</span>}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
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
              <div>
                <label>ЕИК / Булстат *</label>
                <input type="text" name="eik" required value={eik} inputMode="numeric"
                  onChange={(e) => { setEik(e.target.value); if (eikErr) setEikErr(""); }}
                  onBlur={checkEik}
                  style={eikErr ? { borderColor: "var(--brick)" } : undefined}
                  placeholder="9 или 13 цифри" />
                {eikErr && <div style={{ color: "var(--brick)", fontSize: 11.5, marginTop: 3 }}>{eikErr}</div>}
              </div>
              <div><label>Телефон на фирмата *</label><input type="tel" required value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+359..." /></div>
              <div>
                <label>Регистрация по ЗДДС *</label>
                <select required value={vatRegistered ? "1" : "0"} onChange={(e) => setVatRegistered(e.target.value === "1")}>
                  <option value="0">Не съм регистриран по ЗДДС</option>
                  <option value="1">Регистриран по ЗДДС</option>
                </select>
              </div>
              <div>
                <label>ДДС номер {vatRegistered ? "*" : "(ако е приложимо)"}</label>
                <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} required={vatRegistered} placeholder="BG..." />
                {vatRegistered && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Фактурите ще се издават с начислено ДДС по подразбиране.</p>}
                {!vatRegistered && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>Фактурите ще се издават без ДДС (чл. 113, ал. 9 от ЗДДС).</p>}
              </div>
              <div><label>МОЛ *</label><input type="text" name="mol" required /></div>
              <div><label>Град *</label><input type="text" name="city" required /></div>
              <div><label>Сектор на дейност *</label>
                <select name="sector" required defaultValue=""><option value="" disabled>Изберете</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label>Адрес на регистрация *</label><input type="text" name="address" required /></div>
            </div>

            <div>
              <label>{accountType === "accounting" ? "Абонамент за счетоводна къща" : "Абонаментен план"}</label>
              {accountType === "accounting" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                  {ACCOUNTANT_PLANS.map((p) => {
                    const active = firmPlan === p.id;
                    const hasPromo = promo && p.regularPrice > p.price;
                    const price = promo ? p.price : p.regularPrice;
                    return (
                      <button type="button" key={p.id} onClick={() => setFirmPlan(p.id)}
                        style={{ textAlign: "left", padding: "12px 12px", borderRadius: 10, cursor: "pointer", position: "relative",
                          background: active ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: active ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
                        {p.recommended && <span style={{ position: "absolute", top: -8, right: 8, background: "var(--brass)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>Препоръчан</span>}
                        <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Fraunces', serif" }}>{p.name}{active && <span style={{ color: "var(--emerald)", marginLeft: 4 }}>✓</span>}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                          {hasPromo && <span className="num" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through", marginRight: 4 }}>{p.regularPrice}</span>}
                          <span className="num" style={{ color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{price}</span>
                          <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 500 }}> €/мес</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--navy)", fontWeight: 600, marginTop: 4 }}>{p.maxClients === Infinity ? "Неограничени фирми" : `До ${p.maxClients} фирми`}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.35 }}>{p.tagline}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
              <>
              {/* Период на плащане */}
              <div style={{ display: "flex", gap: 4, margin: "4px 0 12px", background: "rgba(255,255,255,.5)", borderRadius: 20, padding: 4, width: "fit-content" }}>
                {BILLING_PERIODS.map((p) => (
                  <button type="button" key={p.id} onClick={() => setPeriod(p)}
                    style={{ border: "none", cursor: "pointer", borderRadius: 16, padding: "6px 14px", fontSize: 12, fontWeight: 600,
                      background: period.id === p.id ? "var(--emerald)" : "transparent", color: period.id === p.id ? "#fff" : "var(--ink-soft)" }}>
                    {p.label}{p.discount > 0 && <span style={{ marginLeft: 4, fontSize: 10.5, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PLAN_DETAILS.map((p) => {
                  const monthlyEff = p.price * (1 - period.discount);
                  const regularMonthly = p.regularPrice * (1 - period.discount);
                  const total = p.price * period.months * (1 - period.discount);
                  const active = plan === p.id;
                  const hasPromo = promo && p.regularPrice > p.price;
                  const Icon = p.Icon;
                  return (
                    <button type="button" key={p.id} onClick={() => setPlan(p.id)}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer", position: "relative",
                        background: active ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: active ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
                      {p.recommended && <span style={{ position: "absolute", top: -8, right: 10, background: "var(--brass)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>Препоръчан</span>}
                      {hasPromo && <span style={{ position: "absolute", top: -8, left: 10, background: "var(--brick)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>Специална цена</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, marginTop: hasPromo ? 6 : 0 }}>
                        <span className="icon-tile" style={{ width: 30, height: 30 }}><Icon /></span>
                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{p.name}</span>
                        {active && <span style={{ marginLeft: "auto", color: "var(--emerald)", fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 700 }}>
                        {hasPromo && <span className="num" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginRight: 5 }}>{regularMonthly.toFixed(regularMonthly % 1 === 0 ? 0 : 2)}</span>}
                        <span className="num" style={{ color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{p.price === 0 ? "0" : monthlyEff.toFixed(monthlyEff % 1 === 0 ? 0 : 2)}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}> € / мес</span>
                      </div>
                      {p.price > 0 && period.months > 1 && (
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{total.toFixed(2)} € за {period.months} м.</div>
                      )}
                      {p.price > 0 && period.months === 1 && (
                        <div className="num" style={{ fontSize: 10.5, color: "var(--muted)" }}>≈ {(p.price * EUR_TO_BGN).toFixed(2)} лв</div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.4 }}>{p.tagline}</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 3 }}>
                        {p.features.slice(0, 4).map((f) => (
                          <li key={f} style={{ fontSize: 10.5, color: "var(--ink-soft)", paddingLeft: 14, position: "relative" }}>
                            <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: active ? "var(--emerald-dark)" : "var(--navy)", border: `1px solid ${active ? "var(--emerald)" : "var(--border)"}`, borderRadius: 7, padding: "6px 0", background: active ? "rgba(15,138,106,.08)" : "transparent" }}>
                        {active ? "✓ Избран" : "Избери"}
                      </div>
                    </button>
                  );
                })}
              </div>
              </>
              )}
              {accountType === "accounting" && (
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  Всеки клиент, който добавите, получава пълен достъп до всички модули. Плащането е по банков път; активираме плана след потвърждаване.
                </p>
              )}
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
