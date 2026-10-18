import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  invoicePaid, invoiceRemaining, invoiceStatus, sortFifo, planFifo, buildClientBalance,
  reconciliationState, needsReconciliation,
  type OpenInvoice,
} from "@/lib/logistics/receivables";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const inv = (id: string, remaining: number, issueDate: string, number: string): OpenInvoice => ({ id, remaining, issueDate, number });

describe("invoiceStatus / paid / remaining — §3", () => {
  it("unpaid when nothing is allocated", () => {
    expect(invoicePaid([])).toBe(0);
    expect(invoiceStatus(1000, 0)).toBe("unpaid");
  });
  it("partial when 0 < paid < total", () => {
    expect(invoiceStatus(1000, 400)).toBe("partially_paid");
    expect(invoiceRemaining(1000, 400)).toBe(600);
  });
  it("paid when paid === total (with rounding tolerance)", () => {
    expect(invoiceStatus(1000, 1000)).toBe("paid");
    expect(invoiceStatus(1000, 999.998)).toBe("paid");
    expect(invoiceRemaining(1000, 1000)).toBe(0);
  });
  it("never reports a negative remaining on overpay-at-row", () => {
    expect(invoiceRemaining(1000, 1200)).toBe(0);
  });
  it("zero/negative total is treated as paid (nothing due)", () => {
    expect(invoiceStatus(0, 0)).toBe("paid");
  });
  it("paid = sum of allocation amounts, decimal-safe", () => {
    expect(invoicePaid([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });
});

describe("sortFifo — oldest issue date first, then number — §5", () => {
  it("orders by issueDate asc then number, not due date", () => {
    const rows = [
      inv("b", 100, "2026-03-01", "0000000010"),
      inv("a", 100, "2026-01-15", "0000000020"),
      inv("c", 100, "2026-03-01", "0000000005"),
    ];
    expect(sortFifo(rows).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
  it("null issue dates sort first (empty key)", () => {
    const rows = [inv("x", 1, "2026-01-01", "2"), inv("y", 1, null as unknown as string, "1")];
    expect(sortFifo(rows)[0].id).toBe("y");
  });
});

describe("planFifo — FIFO allocation + overpayment credit — §5/§6", () => {
  const invoices = [
    inv("i1", 300, "2026-01-01", "1"),
    inv("i2", 500, "2026-02-01", "2"),
    inv("i3", 200, "2026-03-01", "3"),
  ];
  it("settles a single invoice partially", () => {
    const p = planFifo(100, invoices);
    expect(p.allocations).toEqual([{ invoiceId: "i1", amount: 100 }]);
    expect(p.credit).toBe(0);
  });
  it("spreads across multiple invoices oldest-first", () => {
    const p = planFifo(650, invoices);
    expect(p.allocations).toEqual([
      { invoiceId: "i1", amount: 300 },
      { invoiceId: "i2", amount: 350 },
    ]);
    expect(p.credit).toBe(0);
  });
  it("covers everything and leaves the rest as credit (overpayment)", () => {
    const p = planFifo(1200, invoices);
    expect(p.allocations.reduce((a, x) => a + x.amount, 0)).toBe(1000);
    expect(p.credit).toBe(200);
  });
  it("never allocates more than an invoice's remaining", () => {
    const p = planFifo(10000, [inv("only", 300, "2026-01-01", "1")]);
    expect(p.allocations).toEqual([{ invoiceId: "only", amount: 300 }]);
    expect(p.credit).toBe(9700);
  });
  it("with no open invoices the whole amount is credit", () => {
    expect(planFifo(500, [])).toEqual({ allocations: [], credit: 500 });
  });
  it("targeted invoice is settled first, then remainder by FIFO (§7)", () => {
    const p = planFifo(400, invoices, "i3");
    expect(p.allocations[0]).toEqual({ invoiceId: "i3", amount: 200 });
    expect(p.allocations[1]).toEqual({ invoiceId: "i1", amount: 200 });
  });
  it("is decimal-safe across fractional amounts", () => {
    const p = planFifo(0.3, [inv("a", 0.1, "2026-01-01", "1"), inv("b", 0.5, "2026-02-01", "2")]);
    expect(p.allocations).toEqual([{ invoiceId: "a", amount: 0.1 }, { invoiceId: "b", amount: 0.2 }]);
    expect(p.credit).toBe(0);
  });
});

describe("buildClientBalance — derived, never a mutable field — §4", () => {
  it("computes invoiced/received/settled/outstanding/credit/net", () => {
    const b = buildClientBalance({
      invoices: [{ total: 300, remaining: 0, recState: "ok" }, { total: 500, remaining: 0, recState: "ok" }],
      activePaymentsTotal: 1000,
      allocationsTotal: 800,
    });
    expect(b.totalInvoiced).toBe(800);
    expect(b.totalReceived).toBe(1000);
    expect(b.settled).toBe(800);
    expect(b.outstanding).toBe(0);
    expect(b.credit).toBe(200);      // unallocated advance
    expect(b.net).toBe(-200);        // customer is in credit
  });
  it("positive net = customer owes (confirmed outstanding only)", () => {
    const b = buildClientBalance({ invoices: [{ total: 1000, remaining: 600, recState: "ok" }], activePaymentsTotal: 400, allocationsTotal: 400 });
    expect(b.credit).toBe(0);
    expect(b.confirmedOutstanding).toBe(600);
    expect(b.net).toBe(600);
  });
  it("credit is never negative", () => {
    const b = buildClientBalance({ invoices: [], activePaymentsTotal: 0, allocationsTotal: 0 });
    expect(b.credit).toBe(0);
  });
});

describe("buildClientBalance — confirmed vs unconfirmed (historical safety) — §4/§5", () => {
  // Пример от заданието: неплатена 100k + частично-платена историческа 200k с неизвестен остатък.
  const b = buildClientBalance({
    invoices: [
      { total: 100000, remaining: 100000, recState: "ok" },                   // реален дълг
      { total: 200000, remaining: 200000, recState: "historically_partial" }, // неизвестно платено
    ],
    activePaymentsTotal: 0, allocationsTotal: 0,
  });
  it("keeps the full math in outstanding", () => {
    expect(b.outstanding).toBe(300000);
  });
  it("splits confirmed vs unconfirmed and counts unreconciled", () => {
    expect(b.confirmedOutstanding).toBe(100000);
    expect(b.unconfirmedOutstanding).toBe(200000);
    expect(b.unreconciledCount).toBe(1);
  });
  it("net reflects only confirmed debt (unconfirmed is flagged, not asserted as owed)", () => {
    expect(b.net).toBe(100000);
  });
  it("historically_paid with no records contributes nothing but is flagged", () => {
    const x = buildClientBalance({ invoices: [{ total: 50000, remaining: 50000, recState: "historically_paid" }], activePaymentsTotal: 0, allocationsTotal: 0 });
    expect(x.confirmedOutstanding).toBe(0);
    expect(x.unconfirmedOutstanding).toBe(0);
    expect(x.outstanding).toBe(0);
    expect(x.unreconciledCount).toBe(1);
  });
});

describe("reconciliationState / needsReconciliation — §3", () => {
  it("partially_paid with zero recorded payments → needs reconciliation (case A)", () => {
    const s = reconciliationState("partially_paid", 0);
    expect(s).toBe("historically_partial");
    expect(needsReconciliation(s)).toBe(true);
  });
  it("paid with zero recorded payments → needs reconciliation (case B)", () => {
    const s = reconciliationState("paid", 0);
    expect(s).toBe("historically_paid");
    expect(needsReconciliation(s)).toBe(true);
  });
  it("partially_paid WITH a recorded payment → ok, no warning (case C)", () => {
    const s = reconciliationState("partially_paid", 40000);
    expect(s).toBe("ok");
    expect(needsReconciliation(s)).toBe(false);
  });
  it("plain unpaid/issued invoices never need reconciliation", () => {
    expect(needsReconciliation(reconciliationState("issued", 0))).toBe(false);
    expect(needsReconciliation(reconciliationState("unpaid", 0))).toBe(false);
  });
});

// ─── Source-level guarantees (safety constraints that live in the API/DB layer) ───
describe("API/DB layer safety guarantees — §9/§10/§11/§12", () => {
  const route = read("src/app/api/logistics/client-payments/route.ts");
  const voidRoute = read("src/app/api/logistics/client-payments/[id]/void/route.ts");
  const db = read("src/lib/logistics/receivablesDb.ts");
  const balanceRoute = read("src/app/api/logistics/clients/[id]/balance/route.ts");

  it("register + void run in serializable transactions", () => {
    expect(route).toContain("Serializable");
    expect(voidRoute).toContain("Serializable");
  });
  it("register is company-scoped and verifies the client belongs to the company (§11)", () => {
    expect(route).toContain("logisticsApiGuard");
    expect(route).toContain("companyId: g.companyId");
    expect(route).toMatch(/client\.findFirst[\s\S]*companyId: g\.companyId/);
  });
  it("does not mix currencies when planning FIFO (§12)", () => {
    expect(route).toContain("i.currency === currency");
  });
  it("has an idempotency pre-check and maps the unique violation to 409 (§12)", () => {
    expect(route).toContain("idempotencyKey");
    expect(route).toContain("P2002");
  });
  it("write permission is manage_invoices; reads use view_logistics (§11)", () => {
    expect(route).toContain('logisticsApiGuard("manage_invoices")');
    expect(balanceRoute).toContain('logisticsApiGuard("view_logistics")');
  });
  it("void soft-marks the payment and records who/when/why (§9)", () => {
    expect(voidRoute).toContain('status: "voided"');
    expect(voidRoute).toContain("voidedById");
    expect(voidRoute).toContain("voidReason");
    expect(voidRoute).not.toMatch(/clientPayment\.delete\b/);
  });
  it("void reverses allocations and recomputes affected invoices (§9)", () => {
    expect(voidRoute).toContain("paymentAllocation.deleteMany");
    expect(voidRoute).toContain("recomputeInvoice");
  });
  it("recompute only counts ACTIVE payment allocations and excludes cancelled invoices (§10)", () => {
    expect(db).toContain('status: "active"');
    expect(db).toMatch(/status:\s*\{\s*not:\s*"cancelled"\s*\}/);
    expect(db).toContain('type: "invoice"');
    expect(db).toContain("deletedAt: null");
  });
  it("recompute reverts to issued (never forces 'unpaid') when zeroed — historical safety (§10)", () => {
    expect(db).toContain('"issued"');
    expect(db).not.toContain('"unpaid"');
  });
  it("balance is derived, not stored on a mutable balance field (§4)", () => {
    expect(balanceRoute).toContain("buildClientBalance");
    expect(db).not.toMatch(/\.balance\s*=/);
  });
});

describe("Historical payments & FIFO safety guarantees — §2/§5/§8", () => {
  const route = read("src/app/api/logistics/client-payments/route.ts");
  const voidRoute = read("src/app/api/logistics/client-payments/[id]/void/route.ts");
  const preview = read("src/app/api/logistics/client-payments/preview/route.ts");
  const db = read("src/lib/logistics/receivablesDb.ts");

  it("auto-FIFO only uses fifo-eligible invoices (excludes unreconciled) (§5)", () => {
    expect(route).toContain("fifoEligible");
    expect(preview).toContain("fifoEligible");
    expect(db).toMatch(/fifoEligible[\s\S]*needsReconciliation/);
  });
  it("historical payments are tagged with source=historical and keep priorStatus (§2/§8)", () => {
    expect(route).toContain('source: "historical"');
    expect(route).toContain("priorStatus");
  });
  it("historical payment records a real payment date distinct from the recorded-at date (§2)", () => {
    // `date` = реална дата; createdAt (@default(now)) = дата на въвеждане
    expect(route).toContain("date: d.date ? new Date(d.date) : new Date()");
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(schema).toContain("source");
    expect(schema).toContain("priorStatus");
  });
  it("duplicate historical payment requires explicit confirmation (§2)", () => {
    expect(route).toContain("duplicate_historical");
    expect(route).toContain("confirmDuplicate");
  });
  it("voiding a historical payment restores the prior status (needs reconciliation again) (§8)", () => {
    expect(voidRoute).toContain("restoreStatusIfZero");
    expect(voidRoute).toMatch(/source === "historical"/);
    expect(db).toContain("restoreStatusIfZero");
  });
});

describe("i18n — payment keys exist in all 6 locales", () => {
  const locales = ["bg", "en", "ru", "ro", "tr", "el"];
  const keys = ["sectionTitle", "register", "totalInvoiced", "outstanding", "credit", "net", "void", "modeAuto", "modeInvoice", "confirm", "method_bank_transfer",
    "unreconciledWarn", "confirmedOutstanding", "toReconcile", "reconcile", "historicalTitle", "historicalHint", "realDate", "dupConfirm", "recHint_historically_paid", "recHint_historically_partial", "historicalTag"];
  for (const l of locales) {
    it(`${l} has logistics.pay.*`, () => {
      const j = JSON.parse(read(`src/locales/${l}/logistics.json`));
      expect(j.pay).toBeTruthy();
      for (const k of keys) expect(j.pay[k], `${l}.pay.${k}`).toBeTruthy();
    });
  }
});
