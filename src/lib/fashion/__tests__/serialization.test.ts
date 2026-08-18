import { describe, it, expect } from "vitest";
import { SERIAL_STATUSES, formatSerial, nextSerial, serialStatusCounts, remainingEdition } from "@/lib/fashion/serialization";

describe("Fashion Serialization — LIMITED (§27)", () => {
  it("формат на серийния номер: 037 / 100", () => {
    expect(formatSerial(37, 100)).toBe("037 / 100");
    expect(formatSerial(5, 1000)).toBe("0005 / 1000");
    expect(formatSerial(7, null)).toBe("007"); // без тираж → само номер
  });
  it("следващ сериен номер = max+1", () => {
    expect(nextSerial([])).toBe(1);
    expect(nextSerial([1, 2, 5])).toBe(6);
  });
  it("броеве по статус", () => {
    const c = serialStatusCounts([{ status: "sold" }, { status: "sold" }, { status: "available" }, { status: "gift" }]);
    expect(c.sold).toBe(2);
    expect(c.available).toBe(1);
    expect(c.gift).toBe(1);
    expect(c.defective).toBe(0);
    expect(SERIAL_STATUSES).toContain("marketing");
  });
  it("оставащи от тиража (не под 0; без тираж → Infinity)", () => {
    expect(remainingEdition(100, 37)).toBe(63);
    expect(remainingEdition(100, 100)).toBe(0);
    expect(remainingEdition(100, 120)).toBe(0);
    expect(remainingEdition(null, 5)).toBe(Infinity);
  });
});
