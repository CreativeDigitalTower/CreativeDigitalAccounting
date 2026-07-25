import { describe, it, expect } from "vitest";
import { maskEmail, coarseDevice, deriveTrackingStatus, statusChips, daysSinceSentUnopened } from "@/lib/documentTracking";

describe("maskEmail (GDPR)", () => {
  it("маскира потребителската част", () => {
    expect(maskEmail("john@doe.com")).toBe("j***@doe.com");
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail("noat")).toBe("***");
  });
});

describe("coarseDevice", () => {
  it("извлича само браузър · ОС", () => {
    expect(coarseDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/120")).toBe("Chrome · Windows");
    expect(coarseDevice("Mozilla/5.0 (iPhone) Safari/604")).toContain("iOS");
    expect(coarseDevice(null)).toBeNull();
  });
});

describe("deriveTrackingStatus", () => {
  const ev = (...types: string[]) => types.map((type) => ({ type }));
  it("bounce има приоритет", () => {
    expect(deriveTrackingStatus(ev("sent", "bounced"), {})).toBe("bounced");
  });
  it("платен", () => {
    expect(deriveTrackingStatus(ev("sent", "email_opened"), { status: "paid" })).toBe("paid");
  });
  it("не изпратен без събития", () => {
    expect(deriveTrackingStatus([], {})).toBe("not_sent");
  });
  it("прогресия sent → delivered → opened → viewed → downloaded", () => {
    expect(deriveTrackingStatus(ev("sent"), { sentToClientAt: new Date() })).toBe("sent");
    expect(deriveTrackingStatus(ev("sent", "delivered"), {})).toBe("delivered");
    expect(deriveTrackingStatus(ev("sent", "email_opened"), {})).toBe("opened");
    expect(deriveTrackingStatus(ev("sent", "viewed"), {})).toBe("viewed");
    expect(deriveTrackingStatus(ev("sent", "downloaded"), {})).toBe("downloaded");
  });
  it("просрочен по dueDate", () => {
    expect(deriveTrackingStatus(ev("sent"), { dueDate: "2000-01-01", status: "sent" })).toBe("overdue");
  });
});

describe("statusChips", () => {
  it("връща индикатори за ключовите събития", () => {
    const chips = statusChips([{ type: "sent" }, { type: "email_opened" }, { type: "downloaded" }], { status: "paid" });
    const keys = chips.map((c) => c.key);
    expect(keys).toContain("tracking.chip.sent");
    expect(keys).toContain("tracking.chip.opened");
    expect(keys).toContain("tracking.chip.downloaded");
    expect(keys).toContain("tracking.chip.paid");
  });
});

describe("daysSinceSentUnopened", () => {
  it("null ако е отворен", () => {
    expect(daysSinceSentUnopened([{ type: "sent", at: new Date().toISOString() }, { type: "email_opened", at: new Date().toISOString() }])).toBeNull();
  });
  it("връща дни при неотворен", () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(daysSinceSentUnopened([{ type: "sent", at: past }])).toBe(5);
  });
  it("null ако не е изпращан", () => {
    expect(daysSinceSentUnopened([])).toBeNull();
  });
});
