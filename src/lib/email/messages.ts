import { baseTemplate, APP_URL, type EmailButton } from "./templates";
import { formatCurrency, BANK_DETAILS } from "@/lib/constants";
import { getMessages, makeT } from "@/lib/i18n/messages";
import { normalizeLocale, intlLocale, type Locale } from "@/lib/i18n/config";

type Msg = { subject: string; html: string; category: string };

/** Преводач, ограничен до `emails.` namespace-а, за даден език. */
function emT(locale: Locale) {
  const loc = normalizeLocale(locale);
  const et = makeT(getMessages(loc));
  return { loc, E: (k: string, v?: Record<string, string | number>) => et(`emails.${k}`, v) };
}

/** Локализирано име на план (free/start/business/pro). */
const planLabel = (E: (k: string, v?: Record<string, string | number>) => string, p?: string | null) =>
  p ? E(`plans.${p}`) : "—";

/** Локализирано име на вид документ. */
const docLabel = (E: (k: string, v?: Record<string, string | number>) => string, t?: string | null) =>
  E(`docTypes.${t ?? "document"}`);

/** Име на план само на български — за админ имейлите (office@), които са винаги на bg. */
const PLAN_LABEL_BG: Record<string, string> = { free: "Безплатен", start: "Старт", business: "Бизнес", pro: "Про" };
const planName = (p?: string | null) => (p ? PLAN_LABEL_BG[p] ?? p : "—");

/** Правилната дума за „ден/дни" според езика и бройката. */
function dayWord(loc: Locale, E: (k: string, v?: Record<string, string | number>) => string, n: number): string {
  const cat = new Intl.PluralRules(intlLocale(loc)).select(n);
  return E(`daysUnit.${cat}`);
}

// ─────────────────────────── АКАУНТ ───────────────────────────

export function welcomeEmail(name: string, verifyUrl?: string, locale: Locale = "bg"): Msg {
  const loc = normalizeLocale(locale);
  const et = makeT(getMessages(loc));
  const E = (k: string, v?: Record<string, string | number>) => et(`emails.welcome.${k}`, v);
  return {
    category: "account",
    subject: E("subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("eyebrow"),
      title: E("title", { name }),
      preheader: E("preheader"),
      intro: [E("intro"), verifyUrl ? E("introVerify") : E("introStart")],
      button: verifyUrl ? { label: E("btnVerify"), url: verifyUrl } : { label: E("btnDashboard"), url: `${APP_URL}/dashboard` },
      footnote: E("footnote"),
    }),
  };
}

export function verifyEmail(name: string, verifyUrl: string, locale: Locale = "bg"): Msg {
  const loc = normalizeLocale(locale);
  const et = makeT(getMessages(loc));
  const E = (k: string, v?: Record<string, string | number>) => et(`emails.verify.${k}`, v);
  return {
    category: "account",
    subject: E("subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("eyebrow"),
      title: E("title"),
      intro: [E("intro1", { name }), E("intro2")],
      button: { label: E("button"), url: verifyUrl },
      footnote: E("footnote"),
    }),
  };
}

export function passwordResetEmail(name: string, resetUrl: string, locale: Locale = "bg"): Msg {
  const loc = normalizeLocale(locale);
  const et = makeT(getMessages(loc));
  const E = (k: string, v?: Record<string, string | number>) => et(`emails.reset.${k}`, v);
  return {
    category: "account",
    subject: E("subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("eyebrow"),
      title: E("title"),
      intro: [E("intro1", { name: name || "" }), E("intro2")],
      button: { label: E("button"), url: resetUrl },
      footnote: E("footnote"),
    }),
  };
}

export function passwordChangedEmail(name: string, locale: Locale = "bg"): Msg {
  const loc = normalizeLocale(locale);
  const et = makeT(getMessages(loc));
  const E = (k: string, v?: Record<string, string | number>) => et(`emails.changed.${k}`, v);
  return {
    category: "account",
    subject: E("subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("eyebrow"),
      title: E("title"),
      intro: [E("intro1", { name: name || "" }), E("intro2")],
      footnote: E("footnote"),
    }),
  };
}

export function accountLockedEmail(name: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "account",
    subject: E("locked.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("locked.eyebrow"),
      title: E("locked.title"),
      intro: [E("locked.intro1", { name: name || "" }), E("locked.intro2")],
      button: { label: E("locked.button"), url: `${APP_URL}/forgot-password` },
      footnote: E("locked.footnote"),
    }),
  };
}

export function newLoginEmail(name: string, info: { ip?: string; device?: string; when: string }, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "account",
    subject: E("newLogin.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("newLogin.eyebrow"),
      title: E("newLogin.title"),
      intro: [E("newLogin.intro1", { name: name || "" }), E("newLogin.intro2")],
      details: [
        { label: E("newLogin.lblTime"), value: info.when },
        ...(info.device ? [{ label: E("newLogin.lblDevice"), value: info.device }] : []),
        ...(info.ip ? [{ label: E("newLogin.lblIp"), value: info.ip }] : []),
      ],
      footnote: E("newLogin.footnote"),
    }),
  };
}

// ─────────────────────────── АБОНАМЕНТИ ───────────────────────────

export function subscriptionSelectedEmail(company: string, plan: string, period: string, amount?: number, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const pl = planLabel(E, plan);
  return {
    category: "subscription",
    subject: E("subSelected.subject", { plan: pl }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("subSelected.eyebrow"),
      title: E("subSelected.title"),
      intro: [E("subSelected.intro1"), E("subSelected.intro2", { plan: pl, company })],
      details: [
        { label: E("subSelected.lblPlan"), value: pl },
        { label: E("subSelected.lblPeriod"), value: E(`period.${period === "yearly" ? "yearly" : "monthly"}`) },
        ...(amount ? [{ label: E("subSelected.lblAmount"), value: formatCurrency(amount) }] : []),
        { label: E("subSelected.lblRecipient"), value: BANK_DETAILS.recipient },
        { label: E("subSelected.lblIban"), value: BANK_DETAILS.iban },
        { label: E("subSelected.lblBank"), value: BANK_DETAILS.bank },
        { label: E("subSelected.lblReason"), value: E("subSelected.reason", { plan: pl, company }) },
      ],
      button: { label: E("subSelected.button"), url: `${APP_URL}/dashboard/subscription` },
      footnote: E("subSelected.footnote"),
    }),
  };
}

export function paymentSuccessEmail(company: string, plan: string, amount: number, method: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "subscription",
    subject: E("paymentSuccess.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("paymentSuccess.eyebrow"),
      title: E("paymentSuccess.title"),
      intro: [E("paymentSuccess.intro", { company })],
      details: [
        { label: E("paymentSuccess.lblPlan"), value: planLabel(E, plan) },
        { label: E("paymentSuccess.lblAmount"), value: formatCurrency(amount) },
        { label: E("paymentSuccess.lblMethod"), value: method },
      ],
      button: { label: E("paymentSuccess.button"), url: `${APP_URL}/dashboard` },
    }),
  };
}

export function paymentFailedEmail(company: string, plan: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "subscription",
    subject: E("paymentFailed.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("paymentFailed.eyebrow"),
      title: E("paymentFailed.title"),
      intro: [E("paymentFailed.intro", { plan: planLabel(E, plan), company })],
      button: { label: E("paymentFailed.button"), url: `${APP_URL}/dashboard/subscription` },
    }),
  };
}

export function subscriptionActivatedEmail(company: string, plan: string, until?: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const pl = planLabel(E, plan);
  return {
    category: "subscription",
    subject: E("subActivated.subject", { plan: pl }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("subActivated.eyebrow"),
      title: E("subActivated.title"),
      intro: [E("subActivated.intro", { plan: pl, company })],
      details: until ? [{ label: E("subActivated.lblUntil"), value: until }] : undefined,
      button: { label: E("subActivated.button"), url: `${APP_URL}/dashboard` },
    }),
  };
}

export function subscriptionExpiringEmail(company: string, plan: string, daysLeft: number, until: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const dw = dayWord(loc, E, daysLeft);
  return {
    category: "reminder",
    subject: E("subExpiring.subject", { days: daysLeft, daysWord: dw }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("subExpiring.eyebrow"),
      title: E("subExpiring.title"),
      intro: [
        E("subExpiring.intro1", { plan: planLabel(E, plan), company, until, days: daysLeft, daysWord: dw }),
        E("subExpiring.intro2"),
      ],
      button: { label: E("subExpiring.button"), url: `${APP_URL}/dashboard/subscription` },
      footnote: E("subExpiring.footnote"),
    }),
  };
}

export function subscriptionExpiredEmail(company: string, plan: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "reminder",
    subject: E("subExpired.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("subExpired.eyebrow"),
      title: E("subExpired.title"),
      intro: [E("subExpired.intro1", { plan: planLabel(E, plan), company }), E("subExpired.intro2")],
      button: { label: E("subExpired.button"), url: `${APP_URL}/dashboard/subscription` },
      footnote: E("subExpired.footnote"),
    }),
  };
}

export function subscriptionRenewedEmail(company: string, plan: string, until: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  return {
    category: "subscription",
    subject: E("subRenewed.subject"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("subRenewed.eyebrow"),
      title: E("subRenewed.title"),
      intro: [E("subRenewed.intro", { plan: planLabel(E, plan), company })],
      details: [{ label: E("subRenewed.lblUntil"), value: until }],
      button: { label: E("subRenewed.button"), url: `${APP_URL}/dashboard` },
    }),
  };
}

export function planChangedEmail(company: string, from: string, to: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const up = ["free", "start", "business", "pro"].indexOf(to) > ["free", "start", "business", "pro"].indexOf(from);
  return {
    category: "subscription",
    subject: up ? E("planChanged.subjectUp") : E("planChanged.subjectDown"),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("planChanged.eyebrow"),
      title: up ? E("planChanged.titleUp") : E("planChanged.titleDown"),
      intro: [E("planChanged.intro", { company, from: planLabel(E, from), to: planLabel(E, to) })],
      button: { label: E("planChanged.button"), url: `${APP_URL}/dashboard/subscription` },
    }),
  };
}

// ─────────────────────────── ДОКУМЕНТИ ───────────────────────────

export function documentCopyEmail(docType: string, number: string, company: string, button: EmailButton, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const label = docLabel(E, docType);
  return {
    category: "document",
    subject: E("docCopy.subject", { label, number }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("docCopy.eyebrow"),
      title: E("docCopy.title", { label, number }),
      intro: [E("docCopy.intro", { company })],
      button,
    }),
  };
}

/** Външен имейл до клиента с фактура/оферта за преглед, приемане/отхвърляне.
 *  `locale` е езикът на документа (Document.language). */
export function invoiceToClientEmail(opts: {
  fromCompany: string; docType: string; number: string; total: string; viewUrl: string; clientName?: string; locale?: Locale;
}): Msg {
  const { loc, E } = emT(opts.locale ?? "bg");
  const label = docLabel(E, opts.docType);
  const lower = label.toLowerCase();
  return {
    category: "document",
    subject: E("toClient.subject", { company: opts.fromCompany, docLabelLower: lower, number: opts.number }),
    html: baseTemplate({
      locale: loc,
      eyebrow: opts.fromCompany,
      title: `${label} № ${opts.number}`,
      intro: [
        opts.clientName ? E("toClient.greetingName", { name: opts.clientName }) : E("toClient.greeting"),
        E("toClient.intro", { company: opts.fromCompany, docLabelLower: lower, total: opts.total }),
        E("toClient.intro2"),
      ],
      button: { label: E("toClient.button"), url: opts.viewUrl },
      footnote: E("toClient.footnote"),
    }),
  };
}

/** Известие до фирмата за решението на клиента. */
export function clientDecisionEmail(opts: { docType: string; number: string; clientName: string; decision: "accepted" | "rejected"; viewUrl: string; locale?: Locale }): Msg {
  const { loc, E } = emT(opts.locale ?? "bg");
  const accepted = opts.decision === "accepted";
  const lower = docLabel(E, opts.docType).toLowerCase();
  const vars = { clientName: opts.clientName, docLabelLower: lower, number: opts.number };
  return {
    category: "client_decision",
    subject: accepted ? E("clientDecision.subjectAccepted", vars) : E("clientDecision.subjectRejected", vars),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("clientDecision.eyebrow"),
      title: accepted ? E("clientDecision.titleAccepted") : E("clientDecision.titleRejected"),
      intro: [accepted ? E("clientDecision.introAccepted", vars) : E("clientDecision.introRejected", vars)],
      button: { label: E("clientDecision.button"), url: opts.viewUrl },
    }),
  };
}

// ─────────────────────────── НАПОМНЯНИЯ ───────────────────────────

export function unpaidInvoiceEmail(company: string, number: string, daysOverdue: number, amount: string, url: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const dw = dayWord(loc, E, daysOverdue);
  return {
    category: "reminder",
    subject: E("unpaidInvoice.subject", { number }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("unpaidInvoice.eyebrow"),
      title: E("unpaidInvoice.title", { number }),
      intro: [E("unpaidInvoice.intro", { number, amount, company, days: daysOverdue, daysWord: dw })],
      button: { label: E("unpaidInvoice.button"), url },
      footnote: E("unpaidInvoice.footnote"),
    }),
  };
}

export function expiringEntityEmail(kind: "contract" | "project" | "warranty" | "license", name: string, date: string, url: string, locale: Locale = "bg"): Msg {
  const { loc, E } = emT(locale);
  const label = E(`entities.${kind}`);
  return {
    category: "reminder",
    subject: E("expiringEntity.subject", { label, name }),
    html: baseTemplate({
      locale: loc,
      eyebrow: E("expiringEntity.eyebrow"),
      title: E("expiringEntity.title", { label, date }),
      intro: [E("expiringEntity.intro", { label, name, date })],
      button: { label: E("expiringEntity.button"), url },
    }),
  };
}

// ─────────────────────────── АДМИН (office@) ───────────────────────────

export function adminNewRegistrationEmail(d: { name: string; company: string; eik?: string | null; email: string; phone?: string | null; plan: string }): Msg {
  return {
    category: "admin",
    subject: `Нова регистрация: ${d.company}`,
    html: baseTemplate({
      eyebrow: "Notification Center",
      title: "Нова регистрация",
      intro: ["Регистрира се нова фирма в платформата:"],
      details: [
        { label: "Име", value: d.name },
        { label: "Фирма", value: d.company },
        { label: "ЕИК", value: d.eik || "—" },
        { label: "Имейл", value: d.email },
        { label: "Телефон", value: d.phone || "—" },
        { label: "План", value: planName(d.plan) },
      ],
      button: { label: "Към Супер Админ", url: `${APP_URL}/dashboard/admin` },
    }),
  };
}

export function adminPaidSubEmail(d: { company: string; plan: string; amount: number; method: string }): Msg {
  return {
    category: "admin",
    subject: `Нов платен абонамент: ${d.company}`,
    html: baseTemplate({
      eyebrow: "Notification Center",
      title: "Нов платен абонамент",
      intro: ["Фирма заяви/плати абонамент:"],
      details: [
        { label: "Фирма", value: d.company },
        { label: "План", value: planName(d.plan) },
        { label: "Стойност", value: formatCurrency(d.amount) },
        { label: "Метод", value: d.method },
      ],
    }),
  };
}

export function adminSimpleEmail(title: string, lines: { label: string; value: string }[], emoji = ""): Msg {
  return {
    category: "admin",
    subject: `${emoji} ${title}`,
    html: baseTemplate({ eyebrow: "Notification Center", title, intro: ["Системно известие:"], details: lines }),
  };
}

export function contactFormEmail(d: { name: string; email: string; message: string; phone?: string }): Msg {
  return {
    category: "admin",
    subject: `Ново съобщение от контактната форма`,
    html: baseTemplate({
      eyebrow: "Notification Center",
      title: "Ново съобщение от контактната форма",
      intro: [d.message.replace(/</g, "&lt;")],
      details: [
        { label: "Име", value: d.name },
        { label: "Имейл", value: d.email },
        ...(d.phone ? [{ label: "Телефон", value: d.phone }] : []),
      ],
    }),
  };
}
