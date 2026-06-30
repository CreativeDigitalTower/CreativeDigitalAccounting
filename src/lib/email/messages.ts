import { baseTemplate, APP_URL, type EmailButton } from "./templates";
import { formatCurrency } from "@/lib/constants";

type Msg = { subject: string; html: string; category: string };

const PLAN_LABEL: Record<string, string> = { free: "Безплатен", start: "Старт", business: "Бизнес", pro: "Про" };
const planName = (p?: string | null) => (p ? PLAN_LABEL[p] ?? p : "—");

// ─────────────────────────── 👤 АКАУНТ ───────────────────────────

export function welcomeEmail(name: string, verifyUrl?: string): Msg {
  return {
    category: "account",
    subject: "Добре дошли в Creative Digital Accounting",
    html: baseTemplate({
      eyebrow: "Регистрацията е успешна",
      title: `Добре дошли, ${name}!`,
      preheader: "Вашият акаунт е създаден успешно.",
      intro: [
        "Радваме се, че се присъединихте. Вашият акаунт е създаден и вече можете да управлявате фактури, документи, клиенти, складове и финанси от едно място.",
        verifyUrl ? "За пълен достъп, моля потвърдете имейл адреса си с бутона по-долу:" : "Влезте в таблото си, за да започнете.",
      ],
      button: verifyUrl ? { label: "Потвърди имейл адреса", url: verifyUrl } : { label: "Към таблото", url: `${APP_URL}/dashboard` },
      footnote: "Ако не сте създавали този акаунт, можете да игнорирате този имейл.",
    }),
  };
}

export function verifyEmail(name: string, verifyUrl: string): Msg {
  return {
    category: "account",
    subject: "Потвърдете имейл адреса си",
    html: baseTemplate({
      eyebrow: "Потвърждение",
      title: "Потвърдете имейл адреса си",
      intro: [`Здравейте, ${name}.`, "Натиснете бутона по-долу, за да потвърдите, че този имейл адрес принадлежи на Вас. Линкът е валиден 24 часа."],
      button: { label: "Потвърди имейла", url: verifyUrl },
      footnote: "Ако не сте се регистрирали, игнорирайте този имейл.",
    }),
  };
}

export function passwordResetEmail(name: string, resetUrl: string): Msg {
  return {
    category: "account",
    subject: "Възстановяване на парола",
    html: baseTemplate({
      eyebrow: "Сигурност",
      title: "Забравена парола",
      intro: [
        `Здравейте, ${name || ""}.`,
        "Получихме заявка за смяна на паролата Ви. Натиснете бутона по-долу, за да зададете нова парола. Линкът е валиден <strong>60 минути</strong>.",
      ],
      button: { label: "Задай нова парола", url: resetUrl },
      footnote: "Ако не сте заявявали смяна на парола, игнорирайте този имейл — паролата Ви остава непроменена.",
    }),
  };
}

export function passwordChangedEmail(name: string): Msg {
  return {
    category: "account",
    subject: "Паролата Ви беше променена",
    html: baseTemplate({
      eyebrow: "Сигурност",
      title: "Паролата Ви беше сменена успешно",
      intro: [`Здравейте, ${name || ""}.`, "Това е потвърждение, че паролата за акаунта Ви беше променена."],
      footnote: "Ако не сте извършвали тази промяна, незабавно се свържете с нас на office@creativedigitalaccounting.com.",
    }),
  };
}

export function accountLockedEmail(name: string): Msg {
  return {
    category: "account",
    subject: "Акаунтът Ви беше временно заключен",
    html: baseTemplate({
      eyebrow: "Сигурност",
      title: "Засечени неуспешни опити за вход",
      intro: [`Здравейте, ${name || ""}.`, "Регистрирахме няколко последователни неуспешни опита за вход. За Ваша защита акаунтът е временно заключен за 15 минути. Ако сте Вие — изчакайте или възстановете паролата си."],
      button: { label: "Възстанови парола", url: `${APP_URL}/forgot-password` },
      footnote: "Ако това не сте били Вие, препоръчваме веднага да смените паролата си.",
    }),
  };
}

export function newLoginEmail(name: string, info: { ip?: string; device?: string; when: string }): Msg {
  return {
    category: "account",
    subject: "Нов вход в акаунта Ви",
    html: baseTemplate({
      eyebrow: "Сигурност",
      title: "Нов вход в акаунта",
      intro: [`Здравейте, ${name || ""}.`, "Регистрирахме вход в акаунта Ви от ново устройство или местоположение:"],
      details: [
        { label: "Време", value: info.when },
        ...(info.device ? [{ label: "Устройство", value: info.device }] : []),
        ...(info.ip ? [{ label: "IP адрес", value: info.ip }] : []),
      ],
      footnote: "Ако това сте Вие — няма нужда от действие. В противен случай сменете паролата си незабавно.",
    }),
  };
}

// ─────────────────────────── 💳 АБОНАМЕНТИ ───────────────────────────

export function subscriptionSelectedEmail(company: string, plan: string, period: string, amount?: number): Msg {
  return {
    category: "subscription",
    subject: `Заявка за абонамент „${planName(plan)}“ е приета`,
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: "Получихме Вашата заявка",
      intro: [`Здравейте,`, `Регистрирахме заявка за план <strong>${planName(plan)}</strong> за фирма ${company}. След потвърждение на плащането, абонаментът ще бъде активиран.`],
      details: [
        { label: "План", value: planName(plan) },
        { label: "Период", value: period === "yearly" ? "Годишен" : "Месечен" },
        ...(amount ? [{ label: "Сума", value: formatCurrency(amount) }] : []),
      ],
      button: { label: "Виж абонамента", url: `${APP_URL}/dashboard/subscription` },
    }),
  };
}

export function paymentSuccessEmail(company: string, plan: string, amount: number, method: string): Msg {
  return {
    category: "subscription",
    subject: "Плащането е успешно — благодарим Ви!",
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: "Плащането е получено",
      intro: [`Благодарим Ви! Плащането за абонамента на ${company} беше потвърдено и планът Ви е активен.`],
      details: [
        { label: "План", value: planName(plan) },
        { label: "Сума", value: formatCurrency(amount) },
        { label: "Метод", value: method },
      ],
      button: { label: "Към таблото", url: `${APP_URL}/dashboard` },
    }),
  };
}

export function paymentFailedEmail(company: string, plan: string): Msg {
  return {
    category: "subscription",
    subject: "Плащането не беше успешно",
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: "Възникна проблем с плащането",
      intro: [`Опитът за плащане на абонамента (${planName(plan)}) за ${company} не беше успешен. Моля, опитайте отново или изберете друг метод за плащане.`],
      button: { label: "Опитай отново", url: `${APP_URL}/dashboard/subscription` },
    }),
  };
}

export function subscriptionActivatedEmail(company: string, plan: string, until?: string): Msg {
  return {
    category: "subscription",
    subject: `Абонаментът „${planName(plan)}“ е активиран`,
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: "Абонаментът Ви е активен",
      intro: [`Планът <strong>${planName(plan)}</strong> за ${company} вече е активен. Благодарим Ви, че сте с нас!`],
      details: until ? [{ label: "Валиден до", value: until }] : undefined,
      button: { label: "Към таблото", url: `${APP_URL}/dashboard` },
    }),
  };
}

export function subscriptionExpiringEmail(company: string, plan: string, daysLeft: number, until: string): Msg {
  return {
    category: "reminder",
    subject: `Абонаментът Ви изтича след ${daysLeft} ${daysLeft === 1 ? "ден" : "дни"}`,
    html: baseTemplate({
      eyebrow: "Напомняне",
      title: `Абонаментът Ви изтича скоро`,
      intro: [
        `Напомняме Ви, че планът <strong>${planName(plan)}</strong> за ${company} изтича на <strong>${until}</strong> (след ${daysLeft} ${daysLeft === 1 ? "ден" : "дни"}).`,
        "Подновете навреме, за да запазите достъпа до всички функции без прекъсване.",
      ],
      button: { label: "Поднови абонамента", url: `${APP_URL}/dashboard/subscription` },
      footnote: "Ако вече сте подновили абонамента си — извиняваме се за безпокойството и Ви молим да пренебрегнете това напомняне.",
    }),
  };
}

export function subscriptionExpiredEmail(company: string, plan: string): Msg {
  return {
    category: "reminder",
    subject: "Абонаментът Ви изтече",
    html: baseTemplate({
      eyebrow: "Напомняне",
      title: "Абонаментът Ви изтече",
      intro: [
        `Планът <strong>${planName(plan)}</strong> за ${company} изтече и акаунтът беше върнат към Безплатния план. Данните Ви са запазени.`,
        "Подновете по всяко време, за да възстановите пълния достъп.",
      ],
      button: { label: "Поднови сега", url: `${APP_URL}/dashboard/subscription` },
      footnote: "Ако вече сте подновили абонамента си — извиняваме се и Ви молим да пренебрегнете това съобщение.",
    }),
  };
}

export function subscriptionRenewedEmail(company: string, plan: string, until: string): Msg {
  return {
    category: "subscription",
    subject: "Абонаментът Ви е подновен",
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: "Благодарим за подновяването",
      intro: [`Планът <strong>${planName(plan)}</strong> за ${company} е подновен успешно.`],
      details: [{ label: "Валиден до", value: until }],
      button: { label: "Към таблото", url: `${APP_URL}/dashboard` },
    }),
  };
}

export function planChangedEmail(company: string, from: string, to: string): Msg {
  const up = ["free", "start", "business", "pro"].indexOf(to) > ["free", "start", "business", "pro"].indexOf(from);
  return {
    category: "subscription",
    subject: up ? "Преминахте към по-висок план" : "Планът Ви беше променен",
    html: baseTemplate({
      eyebrow: "Абонамент",
      title: up ? "Надградихте абонамента си" : "Промяна на абонамента",
      intro: [`Планът на ${company} беше променен от <strong>${planName(from)}</strong> на <strong>${planName(to)}</strong>.`],
      button: { label: "Виж промените", url: `${APP_URL}/dashboard/subscription` },
    }),
  };
}

// ─────────────────────────── 📄 ДОКУМЕНТИ ───────────────────────────

const DOC_LABEL: Record<string, string> = {
  invoice: "Фактура", proforma: "Проформа фактура", quote: "Оферта",
  credit_note: "Кредитно известие", debit_note: "Дебитно известие", contract: "Договор", protocol: "Протокол",
};

export function documentCopyEmail(docType: string, number: string, company: string, button: EmailButton): Msg {
  const label = DOC_LABEL[docType] ?? "Документ";
  return {
    category: "document",
    subject: `Копие: ${label} № ${number}`,
    html: baseTemplate({
      eyebrow: "Документ",
      title: `${label} № ${number}`,
      intro: [`Прилагаме копие на издадения от ${company} документ. Можете да го прегледате и изтеглите от линка по-долу.`],
      button,
    }),
  };
}

/** Външен имейл до клиента с фактура/оферта за преглед, приемане/отхвърляне. */
export function invoiceToClientEmail(opts: {
  fromCompany: string; docLabel: string; number: string; total: string; viewUrl: string; clientName?: string;
}): Msg {
  return {
    category: "document",
    subject: `${opts.fromCompany} Ви изпрати ${opts.docLabel.toLowerCase()} № ${opts.number}`,
    html: baseTemplate({
      eyebrow: opts.fromCompany,
      title: `${opts.docLabel} № ${opts.number}`,
      intro: [
        `Здравейте${opts.clientName ? ", " + opts.clientName : ""},`,
        `Фирма <strong>${opts.fromCompany}</strong> Ви изпрати ${opts.docLabel.toLowerCase()} на стойност <strong>${opts.total}</strong>.`,
        "Можете да я прегледате, изтеглите като PDF и да я приемете или отхвърлите онлайн:",
      ],
      button: { label: "Преглед на документа", url: opts.viewUrl },
      footnote: "Бутонът отваря защитена страница само за Вас — не е нужна регистрация.",
    }),
  };
}

/** Известие до фирмата за решението на клиента. */
export function clientDecisionEmail(opts: { docLabel: string; number: string; clientName: string; decision: "accepted" | "rejected"; viewUrl: string }): Msg {
  const accepted = opts.decision === "accepted";
  return {
    category: "client_decision",
    subject: `${opts.clientName} ${accepted ? "прие" : "отхвърли"} ${opts.docLabel.toLowerCase()} № ${opts.number}`,
    html: baseTemplate({
      eyebrow: "Решение на клиент",
      title: accepted ? "Документът беше приет ✓" : "Документът беше отхвърлен",
      intro: [`Клиентът <strong>${opts.clientName}</strong> ${accepted ? "прие" : "отхвърли"} ${opts.docLabel.toLowerCase()} № ${opts.number}.`],
      button: { label: "Отвори документа", url: opts.viewUrl },
    }),
  };
}

// ─────────────────────────── 🔔 НАПОМНЯНИЯ ───────────────────────────

export function unpaidInvoiceEmail(company: string, number: string, daysOverdue: number, amount: string, url: string): Msg {
  return {
    category: "reminder",
    subject: `Неплатена фактура № ${number}`,
    html: baseTemplate({
      eyebrow: "Напомняне",
      title: `Фактура № ${number} все още не е платена`,
      intro: [`Напомняме, че фактура № ${number} (${amount}) за ${company} е с изтекъл падеж от ${daysOverdue} ${daysOverdue === 1 ? "ден" : "дни"}.`],
      button: { label: "Виж фактурата", url },
      footnote: "Ако плащането вече е извършено, моля пренебрегнете това напомняне.",
    }),
  };
}

export function expiringEntityEmail(kind: "contract" | "project" | "warranty" | "license", name: string, date: string, url: string): Msg {
  const LABEL = { contract: "Договор", project: "Проект", warranty: "Гаранция", license: "Лиценз" }[kind];
  return {
    category: "reminder",
    subject: `${LABEL} изтича скоро: ${name}`,
    html: baseTemplate({
      eyebrow: "Напомняне",
      title: `${LABEL} изтича на ${date}`,
      intro: [`${LABEL} „${name}“ наближава крайния си срок (${date}). Прегледайте го навреме.`],
      button: { label: `Отвори`, url },
    }),
  };
}

// ─────────────────────────── 🛡️ АДМИН (office@) ───────────────────────────

export function adminNewRegistrationEmail(d: { name: string; company: string; eik?: string | null; email: string; phone?: string | null; plan: string }): Msg {
  return {
    category: "admin",
    subject: `🟢 Нова регистрация: ${d.company}`,
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
    subject: `💳 Нов платен абонамент: ${d.company}`,
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

export function adminSimpleEmail(title: string, lines: { label: string; value: string }[], emoji = "🔔"): Msg {
  return {
    category: "admin",
    subject: `${emoji} ${title}`,
    html: baseTemplate({ eyebrow: "Notification Center", title, intro: ["Системно известие:"], details: lines }),
  };
}

export function contactFormEmail(d: { name: string; email: string; message: string; phone?: string }): Msg {
  return {
    category: "admin",
    subject: `✉️ Ново съобщение от контактната форма`,
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
