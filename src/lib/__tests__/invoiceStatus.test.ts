import { describe, it, expect } from "vitest";
import {
  getInvoiceDisplayStatus,
  matchesInvoiceStatusFilter,
  isInvoicePaid,
  isInvoicePartiallyPaid,
  isInvoiceOverdue,
  hasInvoiceBeenSent,
  type InvoiceStatusInput,
} from "@/lib/invoiceStatus";

const NOW = new Date("2026-07-29T12:00:00Z");
const past = new Date("2026-07-01T00:00:00Z");
const future = new Date("2026-08-30T00:00:00Z");

function inv(over: Partial<InvoiceStatusInput> = {}): InvoiceStatusInput {
  return { status: "issued", paidAmount: 0, total: 100, dueDate: null, sentToClientAt: null, ...over };
}

describe("getInvoiceDisplayStatus — приоритет и извеждане", () => {
  it("чернова", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "draft" }), NOW)).toBe("draft");
  });
  it("издадена (финализирана, без изпращане/плащане)", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued" }), NOW)).toBe("issued");
  });
  it("изпратена по имейл (sentToClientAt) макар статусът да е issued", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued", sentToClientAt: past }), NOW)).toBe("sent");
  });
  it("изпратена по явен статус", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "sent" }), NOW)).toBe("sent");
  });
  it("частично платена по сума", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "sent", paidAmount: 40 }), NOW)).toBe("partially_paid");
  });
  it("платена по сума (покрива общата)", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued", paidAmount: 100 }), NOW)).toBe("paid");
  });
  it("платена по явен статус", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "paid" }), NOW)).toBe("paid");
  });
  it("просрочена — финализирана, неплатена, падеж в миналото", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued", dueDate: past }), NOW)).toBe("overdue");
  });
  it("просрочието е с приоритет пред частичното плащане", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "sent", paidAmount: 30, dueDate: past }), NOW)).toBe("overdue");
  });
  it("платена фактура с минал падеж НЕ е просрочена", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued", paidAmount: 100, dueDate: past }), NOW)).toBe("paid");
  });
  it("анулирана — дори с минал падеж — не е просрочена", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "cancelled", dueDate: past }), NOW)).toBe("cancelled");
  });
  it("бъдещ падеж — не е просрочена", () => {
    expect(getInvoiceDisplayStatus(inv({ status: "issued", dueDate: future }), NOW)).toBe("issued");
  });
});

describe("предикати", () => {
  it("isInvoicePaid — толеранс за плаваща запетая", () => {
    expect(isInvoicePaid(inv({ paidAmount: 99.999, total: 100 }))).toBe(true);
    expect(isInvoicePaid(inv({ paidAmount: 99.5, total: 100 }))).toBe(false);
  });
  it("isInvoicePartiallyPaid — строго между 0 и общата", () => {
    expect(isInvoicePartiallyPaid(inv({ paidAmount: 0 }))).toBe(false);
    expect(isInvoicePartiallyPaid(inv({ paidAmount: 50 }))).toBe(true);
    expect(isInvoicePartiallyPaid(inv({ paidAmount: 100 }))).toBe(false);
  });
  it("hasInvoiceBeenSent — статус или sentToClientAt", () => {
    expect(hasInvoiceBeenSent(inv({ status: "issued" }))).toBe(false);
    expect(hasInvoiceBeenSent(inv({ status: "issued", sentToClientAt: past }))).toBe(true);
    expect(hasInvoiceBeenSent(inv({ status: "sent" }))).toBe(true);
  });
  it("isInvoiceOverdue — чернова никога не е просрочена", () => {
    expect(isInvoiceOverdue(inv({ status: "draft", dueDate: past }), NOW)).toBe(false);
  });
});

describe("matchesInvoiceStatusFilter", () => {
  it("all/празно връзка връща всичко", () => {
    expect(matchesInvoiceStatusFilter(inv(), null, NOW)).toBe(true);
    expect(matchesInvoiceStatusFilter(inv(), "all", NOW)).toBe(true);
  });
  it("филтър sent хваща изпратена по имейл (issued + sentToClientAt)", () => {
    expect(matchesInvoiceStatusFilter(inv({ status: "issued", sentToClientAt: past }), "sent", NOW)).toBe(true);
    expect(matchesInvoiceStatusFilter(inv({ status: "issued" }), "sent", NOW)).toBe(false);
  });
  it("филтър overdue хваща просрочена issued фактура", () => {
    expect(matchesInvoiceStatusFilter(inv({ status: "issued", dueDate: past }), "overdue", NOW)).toBe(true);
  });
  it("филтър issued изключва изпратени/платени/просрочени", () => {
    expect(matchesInvoiceStatusFilter(inv({ status: "issued" }), "issued", NOW)).toBe(true);
    expect(matchesInvoiceStatusFilter(inv({ status: "sent" }), "issued", NOW)).toBe(false);
  });
});
