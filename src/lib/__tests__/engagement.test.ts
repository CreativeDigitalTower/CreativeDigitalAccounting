import { describe, it, expect } from "vitest";
import {
  getCompanyEngagementStatus,
  isReactivationCandidate,
  reminderCooldown,
  hasRealActivity,
  type ActivationSignals,
} from "@/lib/engagement";

const NOW = new Date("2026-07-29T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

function sig(over: Partial<ActivationSignals> = {}): ActivationSignals {
  return {
    createdAt: daysAgo(30),
    invoiceCount: 0, documentCount: 0, clientCount: 0,
    lastActivityAt: null,
    reminderCount: 0, lastReminderAt: null, firstInvoiceAt: null,
    ...over,
  };
}

describe("getCompanyEngagementStatus", () => {
  it("нова фирма (<2 дни) без дейност → new", () => {
    expect(getCompanyEngagementStatus(sig({ createdAt: daysAgo(1) }), NOW)).toBe("new");
  });
  it("стара регистрация без никаква дейност → inactive", () => {
    expect(getCompanyEngagementStatus(sig({ createdAt: daysAgo(30) }), NOW)).toBe("inactive");
  });
  it("издадена фактура → active", () => {
    expect(getCompanyEngagementStatus(sig({ invoiceCount: 2 }), NOW)).toBe("active");
  });
  it("има клиент/документ но без фактура и скорошна активност → partial", () => {
    expect(getCompanyEngagementStatus(sig({ clientCount: 1, lastActivityAt: daysAgo(2) }), NOW)).toBe("partial");
  });
  it("има документ но без активност отдавна → inactive", () => {
    expect(getCompanyEngagementStatus(sig({ documentCount: 1, lastActivityAt: daysAgo(40) }), NOW)).toBe("inactive");
  });
  it("първа фактура след напомняне → reactivated", () => {
    expect(getCompanyEngagementStatus(sig({ invoiceCount: 1, lastReminderAt: daysAgo(10), firstInvoiceAt: daysAgo(3) }), NOW)).toBe("reactivated");
  });
  it("фактура ПРЕДИ напомняне → не е reactivated (active)", () => {
    expect(getCompanyEngagementStatus(sig({ invoiceCount: 1, lastReminderAt: daysAgo(3), firstInvoiceAt: daysAgo(10) }), NOW)).toBe("active");
  });
});

describe("isReactivationCandidate", () => {
  it("стара неактивна фирма е кандидат", () => {
    expect(isReactivationCandidate(sig({ createdAt: daysAgo(10) }), NOW)).toBe(true);
  });
  it("съвсем нова фирма (<2 дни) НЕ е кандидат", () => {
    expect(isReactivationCandidate(sig({ createdAt: daysAgo(1) }), NOW)).toBe(false);
  });
  it("активна фирма (с фактура) НЕ е кандидат", () => {
    expect(isReactivationCandidate(sig({ invoiceCount: 1 }), NOW)).toBe(false);
  });
});

describe("hasRealActivity", () => {
  it("отчита фактура/документ/клиент", () => {
    expect(hasRealActivity({ invoiceCount: 0, documentCount: 0, clientCount: 0 })).toBe(false);
    expect(hasRealActivity({ invoiceCount: 1, documentCount: 0, clientCount: 0 })).toBe(true);
    expect(hasRealActivity({ invoiceCount: 0, documentCount: 0, clientCount: 3 })).toBe(true);
  });
});

describe("reminderCooldown", () => {
  it("без предишни напомняния → може да изпраща", () => {
    const cd = reminderCooldown(0, null, NOW);
    expect(cd.canSend).toBe(true);
    expect(cd.daysSinceLast).toBeNull();
  });
  it("напомняне преди 5 дни → в cooldown, не може без override", () => {
    const cd = reminderCooldown(1, daysAgo(5), NOW);
    expect(cd.inCooldown).toBe(true);
    expect(cd.canSend).toBe(false);
    expect(cd.daysUntilAllowed).toBe(9); // 14 - 5
  });
  it("напомняне преди 20 дни → извън cooldown, може", () => {
    const cd = reminderCooldown(1, daysAgo(20), NOW);
    expect(cd.canSend).toBe(true);
    expect(cd.inCooldown).toBe(false);
  });
  it("достигнат максимум (3) → не може без override, дори извън cooldown", () => {
    const cd = reminderCooldown(3, daysAgo(60), NOW);
    expect(cd.maxReached).toBe(true);
    expect(cd.canSend).toBe(false);
  });
});
