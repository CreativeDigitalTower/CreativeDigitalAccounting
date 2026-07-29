// ─────────────────────────────────────────────────────────────────────────
// Централизирана логика за статуса на фактура/документ.
//
// Проблем, който решава: съхраненият `status` не се обновява при всяко събитие —
// изпращането по имейл записва само `sentToClientAt` (без да поврежда основния
// статус), а просрочието/частичното плащане не се материализират в полето.
// Затова „ефективният" (display) статус се ИЗВЕЖДА от няколко надеждни сигнала:
//   съхранен status · sentToClientAt · paidAmount · dueDate.
// Една и съща логика се ползва за списъка, филтрите и броячите, за да няма
// разминаване между това, което потребителят вижда, и това, което филтърът връща.
// ─────────────────────────────────────────────────────────────────────────

export type InvoiceStatusFilter =
  | "draft" | "issued" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";

/** Толеранс срещу грешки с плаваща запетая (под 1 стотинка). */
const EPS = 0.005;

export type InvoiceStatusInput = {
  status: string;
  paidAmount?: number | null;
  total: number;
  dueDate?: Date | string | null;
  sentToClientAt?: Date | string | null;
};

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Платена изцяло — по явен статус или когато платената сума покрива общата. */
export function isInvoicePaid(d: InvoiceStatusInput): boolean {
  if (d.status === "paid") return true;
  const paid = d.paidAmount ?? 0;
  return d.total > 0 && paid >= d.total - EPS;
}

/** Частично платена — плащане > 0, но по-малко от общата сума (и не е платена). */
export function isInvoicePartiallyPaid(d: InvoiceStatusInput): boolean {
  if (isInvoicePaid(d)) return false;
  if (d.status === "cancelled") return false;
  if (d.status === "partially_paid") return true;
  const paid = d.paidAmount ?? 0;
  return paid > EPS && paid < d.total - EPS;
}

/** Реално изпратена — по явен статус „sent" ИЛИ регистрирано изпращане по имейл. */
export function hasInvoiceBeenSent(d: InvoiceStatusInput): boolean {
  return d.status === "sent" || !!d.sentToClientAt;
}

/**
 * Просрочена — финализирана, неплатена (или частично платена) и с падеж преди днес.
 * Анулираните, черновите и платените НИКОГА не са просрочени.
 */
export function isInvoiceOverdue(d: InvoiceStatusInput, now: Date = new Date()): boolean {
  if (d.status === "cancelled" || d.status === "draft") return false;
  if (isInvoicePaid(d)) return false;
  if (d.status === "overdue") return true; // ръчно маркиране от потребителя
  if (!d.dueDate) return false;
  return startOfDay(new Date(d.dueDate)) < startOfDay(now);
}

/**
 * Ефективен (display) статус на фактура — точно един от седемте.
 * Приоритет (най-специфичното печели):
 *   1) cancelled  2) paid  3) overdue  4) partially_paid  5) sent  6) issued  7) draft
 * Просрочието е с приоритет пред частичното плащане: частично платена и просрочена
 * фактура се показва като „Просрочена" (т.е. изисква събиране).
 */
export function getInvoiceDisplayStatus(d: InvoiceStatusInput, now: Date = new Date()): InvoiceStatusFilter {
  if (d.status === "cancelled") return "cancelled";
  if (isInvoicePaid(d)) return "paid";
  if (isInvoiceOverdue(d, now)) return "overdue";
  if (isInvoicePartiallyPaid(d)) return "partially_paid";
  if (hasInvoiceBeenSent(d)) return "sent";
  if (d.status === "draft") return "draft";
  return "issued";
}

/** Съвпада ли фактурата с избрания филтър („all"/undefined = всички). */
export function matchesInvoiceStatusFilter(
  d: InvoiceStatusInput,
  filter: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!filter || filter === "all") return true;
  return getInvoiceDisplayStatus(d, now) === filter;
}
