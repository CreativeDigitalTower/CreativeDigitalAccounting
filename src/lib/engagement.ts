// ─────────────────────────────────────────────────────────────────────────
// Централизирана логика за „engagement" (ниво на реално използване) на фирма.
// Използва се от Super Admin за ръчно повторно активиране на регистрирани, но
// неизползващи платформата фирми. НЕ разчита само на createdAt — гледа реални
// сигнали: издадени фактури, документи, клиенти, последна активност/влизане.
// ─────────────────────────────────────────────────────────────────────────

export type EngagementStatus = "new" | "inactive" | "partial" | "active" | "reactivated";

/** Надеждни сигнали за активност на фирма (всичко от реални данни). */
export type ActivationSignals = {
  createdAt: Date | string;
  invoiceCount: number;          // издадени фактури (type=invoice)
  documentCount: number;         // всички документи (какъвто и да е тип)
  clientCount: number;           // добавени клиенти/контрагенти
  lastActivityAt: Date | string | null; // последна регистрирана активност (SiteVisit/документ)
  // История на напомнянията за активиране (от EmailLog type=reactivation_reminder):
  reminderCount: number;
  lastReminderAt: Date | string | null;
  // Реактивация: най-силният сигнал е първа фактура СЛЕД последното напомняне.
  firstInvoiceAt: Date | string | null;
};

const DAY = 86_400_000;
export const REACTIVATION_COOLDOWN_DAYS = 14;
export const REACTIVATION_MAX_REMINDERS = 3;
/** Праг „преди поне N дни от регистрацията", за да не безпокоим съвсем нови фирми. */
export const MIN_AGE_DAYS = 2;
/** Праг за „без активност от X дни". */
export const STALE_ACTIVITY_DAYS = 7;

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}
function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY);
}

/** Има ли фирмата реална дейност (документ/фактура/клиент). */
export function hasRealActivity(s: Pick<ActivationSignals, "invoiceCount" | "documentCount" | "clientCount">): boolean {
  return s.invoiceCount > 0 || s.documentCount > 0 || s.clientCount > 0;
}

/**
 * Определя engagement статуса на фирма от нейните сигнали.
 * - active: издала е фактура или има документи + скорошна активност
 * - reactivated: издала е първа фактура СЛЕД последното напомняне
 * - partial: има някаква дейност (клиент/документ), но не и издадена фактура
 * - new: съвсем нова регистрация (под MIN_AGE_DAYS) без дейност
 * - inactive: регистрирана отдавна, без реална дейност / без скорошна активност
 */
export function getCompanyEngagementStatus(s: ActivationSignals, now: Date = new Date()): EngagementStatus {
  const created = toDate(s.createdAt) ?? now;
  const ageDays = daysBetween(now, created);
  const lastReminder = toDate(s.lastReminderAt);
  const firstInvoice = toDate(s.firstInvoiceAt);

  // Реактивирана: първа фактура след последното напомняне.
  if (lastReminder && firstInvoice && firstInvoice.getTime() >= lastReminder.getTime()) {
    return "reactivated";
  }

  // Активна: издала е фактура (силен сигнал за реално използване).
  if (s.invoiceCount > 0) return "active";

  const lastAct = toDate(s.lastActivityAt);
  const staleDays = lastAct ? daysBetween(now, lastAct) : ageDays;

  // Има някаква дейност (документ/клиент), но без фактура → частично активна.
  if (s.documentCount > 0 || s.clientCount > 0) {
    return staleDays <= STALE_ACTIVITY_DAYS ? "partial" : "inactive";
  }

  // Никаква дейност.
  if (ageDays < MIN_AGE_DAYS) return "new";
  return "inactive";
}

/**
 * Дали фирмата е подходящ кандидат за ръчно напомняне за активиране.
 * НЕ проверява email валидност/bounce — това е отговорност на изпращащия слой.
 */
export function isReactivationCandidate(s: ActivationSignals, now: Date = new Date()): boolean {
  const created = toDate(s.createdAt) ?? now;
  if (daysBetween(now, created) < MIN_AGE_DAYS) return false; // твърде нова
  if (hasRealActivity(s)) {
    // Има дейност, но ако е издала фактура — вече е активна, не е кандидат.
    if (s.invoiceCount > 0) return false;
  }
  const status = getCompanyEngagementStatus(s, now);
  return status === "inactive" || status === "new" || (status === "partial" && !hasRealActivity({ invoiceCount: s.invoiceCount, documentCount: 0, clientCount: 0 }));
}

export type CooldownState = {
  /** Може ли да се изпрати напомняне сега (без override). */
  canSend: boolean;
  /** Достигнат ли е максималният брой напомняния. */
  maxReached: boolean;
  /** В рамките на cooldown прозореца ли сме. */
  inCooldown: boolean;
  /** Дни от последното напомняне (или null, ако няма такова). */
  daysSinceLast: number | null;
  /** Дни оставащи до края на cooldown (0, ако е извън прозореца). */
  daysUntilAllowed: number;
};

/** Изчислява дали е позволено ново напомняне спрямо cooldown + максимум. */
export function reminderCooldown(
  reminderCount: number,
  lastReminderAt: Date | string | null,
  now: Date = new Date()
): CooldownState {
  const last = toDate(lastReminderAt);
  const daysSinceLast = last ? daysBetween(now, last) : null;
  const inCooldown = daysSinceLast != null && daysSinceLast < REACTIVATION_COOLDOWN_DAYS;
  const maxReached = reminderCount >= REACTIVATION_MAX_REMINDERS;
  const daysUntilAllowed = inCooldown && daysSinceLast != null ? REACTIVATION_COOLDOWN_DAYS - daysSinceLast : 0;
  return { canSend: !inCooldown && !maxReached, maxReached, inCooldown, daysSinceLast, daysUntilAllowed };
}
