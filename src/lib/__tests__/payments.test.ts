import { describe, it, expect } from "vitest";
import { paymentDisplayStatus, summarizePayments, type PaymentLike } from "@/lib/payments";

const NOW = new Date("2026-08-01T12:00:00Z");
const p = (over: Partial<PaymentLike> = {}): PaymentLike => ({ direction: "in", status: "completed", amount: 100, dueDate: null, ...over });

describe("paymentDisplayStatus", () => {
  it("завършено входящо → received", () => {
    expect(paymentDisplayStatus(p({ direction: "in", status: "completed" }), NOW)).toBe("received");
  });
  it("завършено изходящо → made", () => {
    expect(paymentDisplayStatus(p({ direction: "out", status: "completed" }), NOW)).toBe("made");
  });
  it("чакащо без минал падеж → pending", () => {
    expect(paymentDisplayStatus(p({ status: "pending", dueDate: "2026-09-01" }), NOW)).toBe("pending");
    expect(paymentDisplayStatus(p({ status: "pending", dueDate: null }), NOW)).toBe("pending");
  });
  it("чакащо с минал падеж → overdue", () => {
    expect(paymentDisplayStatus(p({ status: "pending", dueDate: "2026-07-01" }), NOW)).toBe("overdue");
  });
});

describe("summarizePayments", () => {
  it("обобщава получени/извършени/нето", () => {
    const s = summarizePayments([
      p({ direction: "in", status: "completed", amount: 500 }),
      p({ direction: "out", status: "completed", amount: 200 }),
      p({ direction: "in", status: "completed", amount: 100 }),
    ], NOW);
    expect(s.received).toBe(600);
    expect(s.made).toBe(200);
    expect(s.net).toBe(400);
    expect(s.count).toBe(3);
  });
  it("отчита чакащи и просрочени поотделно", () => {
    const s = summarizePayments([
      p({ direction: "in", status: "pending", amount: 300, dueDate: "2026-09-01" }),      // pending in
      p({ direction: "out", status: "pending", amount: 150, dueDate: "2026-07-01" }),      // overdue out
      p({ direction: "in", status: "pending", amount: 80, dueDate: "2026-07-15" }),        // overdue in
    ], NOW);
    expect(s.pendingIn).toBe(380);   // 300 + 80 (overdue also counts as pendingIn)
    expect(s.pendingOut).toBe(150);
    expect(s.overdue).toBe(230);     // 150 + 80
    expect(s.received).toBe(0);
    expect(s.made).toBe(0);
  });
  it("празен списък → нули", () => {
    const s = summarizePayments([], NOW);
    expect(s).toMatchObject({ received: 0, made: 0, net: 0, pendingIn: 0, pendingOut: 0, overdue: 0, count: 0 });
  });
});
