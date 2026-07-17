"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { metaTrack } from "@/lib/metaClient";
import { PLAN_DETAILS, BILLING_PERIODS } from "@/components/marketing/Pricing";
import { EUR_TO_BGN, isPromoActive, ACCOUNTANT_PLANS } from "@/lib/constants";
import { validateEik } from "@/lib/validation/eik";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

// Стабилни стойности (bg) за бекенда; етикетите се превеждат по индекс.
const SECTOR_VALUES = ["Търговия", "Услуги", "Производство", "IT / Софтуер", "Строителство", "Транспорт", "Туризъм / Ресторантьорство", "Земеделие", "Здравеопазване", "Образование", "Финанси", "Свободна професия", "Друг"];
const ROLE_VALUES = ["Собственик / Управител", "Счетоводител", "Финансов директор", "Служител", "Упълномощено лице", "Друго"];

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
  const t = useT();
  const { messages } = useI18n();
  const RG = (messages as unknown as { register: Record<string, string | string[]> }).register;
  const RP = (messages as unknown as { pricing: { plans: Record<string, { name: string; tagline: string; features: string[] }>; firmPlans: Record<string, { name: string; tagline: string }> } }).pricing;

  function checkEik() {
    const r = validateEik(eik);
    setEikErr(r.isValid ? "" : (r.error ?? t("register.errEik")));
    return r;
  }

  async function nextStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (acc.email !== acc.email2) { setError(t("register.errEmailMismatch")); return; }
    if (acc.password !== acc.password2) { setError(t("register.errPwMismatch")); return; }
    if (acc.password.length < 8) { setError(t("register.errPwLen")); return; }
    // Проверка дали имейлът вече е зает — още на първата стъпка.
    try {
      const r = await fetch("/api/auth/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: acc.email }) });
      const d = await r.json().catch(() => ({ available: true }));
      if (!d.available) { setError(t("register.errEmailTaken")); return; }
    } catch { /* при мрежова грешка продължаваме — проверката се повтаря при финалния запис */ }
    setStep("company");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (!fd.get("acceptTerms")) { setLoading(false); setError(t("register.errAcceptTerms")); return; }

    // Валидация на ЕИК/БУЛСТАT преди изпращане
    const eikCheck = checkEik();
    if (!eikCheck.isValid) { setLoading(false); setError(eikCheck.error ?? t("register.errEik")); return; }
    if (vatRegistered && !vatNumber.trim()) { setLoading(false); setError(t("register.errVatRequired")); return; }

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
      setError((await res.json()).error ?? t("register.errGeneric"));
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 520 }}>
      <div className="glass panel" style={{ padding: "36px 34px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: step === "account" ? "var(--emerald)" : "var(--muted)" }}>{t("register.step1")}</span>
          <span style={{ color: "var(--border)" }}>→</span>
          <span style={{ color: step === "company" ? "var(--emerald)" : "var(--muted)" }}>{t("register.step2")}</span>
        </div>

        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>
          {step === "account" ? t("register.titleAccount") : t("register.titleCompany")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 22px" }}>
          {step === "account" ? t("register.subAccount") : t("register.subCompany")}
        </p>

        {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {step === "account" ? (
          <form onSubmit={nextStep} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div>
              <label>{t("register.accountTypeLabel")}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                {([
                  { id: "business", title: RG.businessTitle as string, desc: RG.businessDesc as string },
                  { id: "accounting", title: RG.accountingTitle as string, desc: RG.accountingDesc as string },
                ] as const).map((opt) => {
                  const active = accountType === opt.id;
                  return (
                    <button type="button" key={opt.id} onClick={() => setAccountType(opt.id)}
                      style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                        background: active ? "var(--emerald-soft)" : "rgba(255,255,255,.5)", border: active ? "2px solid var(--emerald)" : "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, fontFamily: "'Fraunces', serif" }}>{opt.title}{active && <span style={{ color: "var(--emerald)", marginLeft: 6 }}>✓</span>}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div><label>{t("register.names")}</label><input type="text" required value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} placeholder={t("register.namePh")} /></div>
            <div><label>{t("register.roleLabel")}</label>
              <select required value={acc.representativeRole} onChange={(e) => setAcc({ ...acc, representativeRole: e.target.value })}>
                <option value="" disabled>{t("register.choose")}</option>
                {ROLE_VALUES.map((r, i) => <option key={r} value={r}>{(RG.roles as string[])[i]}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>{t("register.email")}</label><input type="email" required value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} /></div>
              <div><label>{t("register.emailConfirm")}</label><input type="email" required value={acc.email2} onChange={(e) => setAcc({ ...acc, email2: e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>{t("register.password")}</label><input type="password" required minLength={8} value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} /></div>
              <div><label>{t("register.passwordConfirm")}</label><input type="password" required minLength={8} value={acc.password2} onChange={(e) => setAcc({ ...acc, password2: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>{t("register.nextStep")}</button>
          </form>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>{t("register.companyName")}</label><input type="text" name="companyName" required placeholder={t("register.companyNamePh")} /></div>
              <div>
                <label>{t("register.eik")}</label>
                <input type="text" name="eik" required value={eik} inputMode="numeric"
                  onChange={(e) => { setEik(e.target.value); if (eikErr) setEikErr(""); }}
                  onBlur={checkEik}
                  style={eikErr ? { borderColor: "var(--brick)" } : undefined}
                  placeholder={t("register.eikPh")} />
                {eikErr && <div style={{ color: "var(--brick)", fontSize: 11.5, marginTop: 3 }}>{eikErr}</div>}
              </div>
              <div><label>{t("register.companyPhone")}</label><input type="tel" required value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+359..." /></div>
              <div>
                <label>{t("register.vatReg")}</label>
                <select required value={vatRegistered ? "1" : "0"} onChange={(e) => setVatRegistered(e.target.value === "1")}>
                  <option value="0">{t("register.vatNo")}</option>
                  <option value="1">{t("register.vatYes")}</option>
                </select>
              </div>
              <div>
                <label>{t("register.vatNumber")} {vatRegistered ? "*" : t("register.vatOptional")}</label>
                <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} required={vatRegistered} placeholder="BG..." />
                {vatRegistered && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{t("register.vatNoteReg")}</p>}
                {!vatRegistered && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{t("register.vatNoteFree")}</p>}
              </div>
              <div><label>{t("register.mol")}</label><input type="text" name="mol" required /></div>
              <div><label>{t("register.city")}</label><input type="text" name="city" required /></div>
              <div><label>{t("register.sectorLabel")}</label>
                <select name="sector" required defaultValue=""><option value="" disabled>{t("register.choose")}</option>{SECTOR_VALUES.map((s, i) => <option key={s} value={s}>{(RG.sectors as string[])[i]}</option>)}</select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label>{t("register.address")}</label><input type="text" name="address" required /></div>
            </div>

            <div>
              <label>{accountType === "accounting" ? t("register.planLabelAccounting") : t("register.planLabelBusiness")}</label>
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
                        {p.recommended && <span style={{ position: "absolute", top: -8, right: 8, background: "var(--brass)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>{t("pricing.recommended")}</span>}
                        <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Fraunces', serif" }}>{RP.firmPlans[p.id]?.name ?? p.name}{active && <span style={{ color: "var(--emerald)", marginLeft: 4 }}>✓</span>}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                          {hasPromo && <span className="num" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through", marginRight: 4 }}>{p.regularPrice}</span>}
                          <span className="num" style={{ color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{price}</span>
                          <span style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 500 }}> {t("register.perMonthShort")}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--navy)", fontWeight: 600, marginTop: 4 }}>{p.maxClients === Infinity ? t("register.unlimitedFirms") : t("register.upToFirms", { n: p.maxClients })}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.35 }}>{RP.firmPlans[p.id]?.tagline ?? p.tagline}</div>
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
                    {t(`pricing.periods.${p.id}`)}{p.discount > 0 && <span style={{ marginLeft: 4, fontSize: 10.5, color: period.id === p.id ? "#fff" : "var(--brass)" }}>−{p.discount * 100}%</span>}
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
                      {p.recommended && <span style={{ position: "absolute", top: -8, right: 10, background: "var(--brass)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{t("pricing.recommended")}</span>}
                      {hasPromo && <span style={{ position: "absolute", top: -8, left: 10, background: "var(--brick)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{t("pricing.specialPrice")}</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, marginTop: hasPromo ? 6 : 0 }}>
                        <span className="icon-tile" style={{ width: 30, height: 30 }}><Icon /></span>
                        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{RP.plans[p.id].name}</span>
                        {active && <span style={{ marginLeft: "auto", color: "var(--emerald)", fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 700 }}>
                        {hasPromo && <span className="num" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "line-through", marginRight: 5 }}>{regularMonthly.toFixed(regularMonthly % 1 === 0 ? 0 : 2)}</span>}
                        <span className="num" style={{ color: hasPromo ? "var(--emerald-dark)" : "var(--ink)" }}>{p.price === 0 ? "0" : monthlyEff.toFixed(monthlyEff % 1 === 0 ? 0 : 2)}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}> {t("register.perMonth")}</span>
                      </div>
                      {p.price > 0 && period.months > 1 && (
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{t("register.totalForShort", { total: total.toFixed(2), months: period.months })}</div>
                      )}
                      {p.price > 0 && period.months === 1 && (
                        <div className="num" style={{ fontSize: 10.5, color: "var(--muted)" }}>{t("register.approxBgn", { amount: (p.price * EUR_TO_BGN).toFixed(2) })}</div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.4 }}>{RP.plans[p.id].tagline}</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 3 }}>
                        {RP.plans[p.id].features.slice(0, 4).map((f: string) => (
                          <li key={f} style={{ fontSize: 10.5, color: "var(--ink-soft)", paddingLeft: 14, position: "relative" }}>
                            <span style={{ position: "absolute", left: 0, color: "var(--emerald)", fontWeight: 700 }}>✓</span>{f}
                          </li>
                        ))}
                      </ul>
                      <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: 700, color: active ? "var(--emerald-dark)" : "var(--navy)", border: `1px solid ${active ? "var(--emerald)" : "var(--border)"}`, borderRadius: 7, padding: "6px 0", background: active ? "rgba(15,138,106,.08)" : "transparent" }}>
                        {active ? t("register.selected") : t("register.chooseBtn")}
                      </div>
                    </button>
                  );
                })}
              </div>
              </>
              )}
              {accountType === "accounting" && (
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  {t("register.accountingNote")}
                </p>
              )}
            </div>

            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, fontSize: 12.5, marginTop: 4 }}>
              <input type="checkbox" name="acceptTerms" style={{ width: "auto", marginTop: 2 }} />
              <span>{t("register.termsPre")}<Link href="/terms" target="_blank" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("register.termsLink")}</Link>{t("register.termsAnd")}<Link href="/privacy" target="_blank" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("register.privacyLink")}</Link>{t("register.termsPost")}</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 400, fontSize: 12.5 }}>
              <input type="checkbox" name="marketingConsent" style={{ width: "auto", marginTop: 2 }} />
              <span>{t("register.marketingConsent")}</span>
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep("account")} style={{ justifyContent: "center" }}>{t("register.back")}</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>{loading ? t("register.submitting") : t("register.submit")}</button>
            </div>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
          {t("register.haveAccount")} <Link href="/login" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("register.login")}</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
