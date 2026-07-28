// ─────────────────────────────────────────────────────────────────────────
// Разделение на трите независими понятия за абонамент:
//   1) Функционален план (plan)         — какви права/лимити има фирмата
//   2) Billing mode (billingMode)        — как се таксува (standard/cdt_client/internal)
//   3) Payment status (paymentStatus)    — потвърдено ли е реално плащане
//
// „Клиент на CDT" = billingMode "cdt_client": фирмата има пълния си функционален
// план БЕЗ такса и НЕ участва в приходите (MRR/ARR/платени/комисионни/чакащи).
// НЕ е отделен план — планът си остава start/business/pro.
// ─────────────────────────────────────────────────────────────────────────

export type BillingMode = "standard" | "cdt_client" | "internal";

export const BILLING_MODES: { id: BillingMode; labelKey: string }[] = [
  { id: "standard", labelKey: "admin.cdt.mode.standard" },
  { id: "cdt_client", labelKey: "admin.cdt.mode.cdt" },
  { id: "internal", labelKey: "admin.cdt.mode.internal" },
];

type SubLike = { billingMode?: string | null; plan?: string | null; paymentStatus?: string | null; status?: string | null } | null | undefined;

export function billingMode(sub: SubLike): BillingMode {
  const m = sub?.billingMode;
  return m === "cdt_client" || m === "internal" ? m : "standard";
}

/** Фирма с предоставен безплатен достъп като клиент на CDT. */
export function isCdtClient(sub: SubLike): boolean {
  return billingMode(sub) === "cdt_client";
}

/** Фирма, изключена от приходите (CDT клиент ИЛИ вътрешна фирма). */
export function isRevenueExcluded(sub: SubLike): boolean {
  return billingMode(sub) !== "standard";
}

/**
 * Реален платящ абонат — влиза в MRR/ARR/платени клиенти/конверсия.
 * Изисква: платен план + активен статус + потвърдено плащане + СТАНДАРТЕН billing
 * (изключва CDT/вътрешни) + да не е собственият акаунт.
 */
export function isPayingSubscriber(
  sub: SubLike,
  opts: { isOwnAccount?: boolean } = {}
): boolean {
  if (opts.isOwnAccount) return false;
  if (isRevenueExcluded(sub)) return false;
  const plan = sub?.plan ?? "free";
  return plan !== "free" && sub?.status === "active" && sub?.paymentStatus === "received";
}

/** Чака ръчно потвърждение на плащане (в блока „Очаква вашето потвърждение"). */
export function isAwaitingPayment(sub: SubLike, opts: { isOwnAccount?: boolean } = {}): boolean {
  if (opts.isOwnAccount) return false;
  if (isRevenueExcluded(sub)) return false; // CDT/вътрешни не чакат плащане
  const plan = sub?.plan ?? "free";
  return plan !== "free" && sub?.status === "active" && sub?.paymentStatus !== "received";
}

/** Дали CDT достъпът е изтекъл (има крайна дата в миналото) → „Изисква преглед". */
export function isCdtExpired(sub: { billingMode?: string | null; cdtEndsAt?: Date | string | null } | null | undefined, now = new Date()): boolean {
  return billingMode(sub) === "cdt_client" && !!sub?.cdtEndsAt && new Date(sub.cdtEndsAt).getTime() < now.getTime();
}
