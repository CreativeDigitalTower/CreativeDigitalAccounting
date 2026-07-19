// ─────────────────────────────────────────────────────────────────────────
// Помощни (чисти) функции за проформи → фактури и за идемпотентност на
// абонаментните проформи. Държим ги отделно от DB логиката, за да са
// тествани изолирано.
// ─────────────────────────────────────────────────────────────────────────

import { planLabel, type PlanId } from "@/lib/constants";

export type ProformaLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export type InvoiceDraftLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

/**
 * Прехвърля редовете на проформа към чернова на фактура — 1:1, без промяна
 * на суми/ставки. Отделена за да е тестваема без база.
 */
export function proformaLinesToInvoiceDraft(lines: ProformaLineInput[]): InvoiceDraftLine[] {
  return lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    vatRate: l.vatRate,
  }));
}

/**
 * Дали описанието на ред от проформа се отнася за конкретен абонаментен план.
 * Използва се за идемпотентност: да НЕ създаваме втора проформа за същия
 * план към същия получател. Сравнява по преведеното/каноничното име на плана
 * (напр. „Про", „Бизнес", „Старт"), нечувствително към регистър.
 */
export function proformaDescribesPlan(description: string, plan: PlanId): boolean {
  const label = planLabel(plan).trim().toLowerCase();
  if (!label) return false;
  return description.trim().toLowerCase().includes(label);
}

/**
 * Дали статусът на проформа означава, че тя е „жива" (все още валидна заявка),
 * т.е. не бива да се дублира. Анулираните не блокират нова проформа.
 */
export function isLiveProformaStatus(status: string): boolean {
  return status !== "cancelled";
}
