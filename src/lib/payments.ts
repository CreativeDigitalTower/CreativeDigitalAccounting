// ─────────────────────────────────────────────────────────────────────────
// Дневник на плащанията — чиста логика (тествана). Определя ефективния статус
// и обобщава сумите. Не пипа фактурите/касата — това е отделен ledger.
// ─────────────────────────────────────────────────────────────────────────

export type PaymentDirection = "in" | "out";     // получено · извършено
export type PaymentStatus = "completed" | "pending";
export type PaymentDisplayStatus = "received" | "made" | "pending" | "overdue";

export type PaymentLike = {
  direction: string;
  status: string;
  amount: number;
  dueDate?: Date | string | null;
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

/**
 * Ефективен статус за показване:
 *   completed + in  → received (получено)
 *   completed + out → made (извършено)
 *   pending + минал падеж → overdue (просрочено)
 *   pending иначе → pending (чакащо)
 */
export function paymentDisplayStatus(p: PaymentLike, now: Date = new Date()): PaymentDisplayStatus {
  if (p.status === "completed") return p.direction === "in" ? "received" : "made";
  if (p.dueDate && startOfDay(new Date(p.dueDate)) < startOfDay(now)) return "overdue";
  return "pending";
}

export type PaymentsSummary = {
  received: number;   // получени (completed in)
  made: number;       // извършени (completed out)
  net: number;        // получени − извършени
  pendingIn: number;  // чакащи входящи
  pendingOut: number; // чакащи изходящи
  overdue: number;    // просрочени (входящи + изходящи)
  count: number;
};

/** Обобщава списък с плащания (закръглено до 2 знака). */
export function summarizePayments(payments: PaymentLike[], now: Date = new Date()): PaymentsSummary {
  const s = { received: 0, made: 0, net: 0, pendingIn: 0, pendingOut: 0, overdue: 0, count: payments.length };
  for (const p of payments) {
    const st = paymentDisplayStatus(p, now);
    if (st === "received") s.received += p.amount;
    else if (st === "made") s.made += p.amount;
    else if (st === "overdue") { s.overdue += p.amount; if (p.direction === "in") s.pendingIn += p.amount; else s.pendingOut += p.amount; }
    else { if (p.direction === "in") s.pendingIn += p.amount; else s.pendingOut += p.amount; }
  }
  s.net = s.received - s.made;
  return {
    received: +s.received.toFixed(2), made: +s.made.toFixed(2), net: +s.net.toFixed(2),
    pendingIn: +s.pendingIn.toFixed(2), pendingOut: +s.pendingOut.toFixed(2), overdue: +s.overdue.toFixed(2), count: s.count,
  };
}
