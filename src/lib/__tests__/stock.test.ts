import { describe, it, expect } from "vitest";
import { allocateFifo, freeQuantity, batchExpiryStatus } from "@/lib/stock";

const b = (id: string, quantity: number, date: string) => ({ id, quantity, deliveryDate: date });

describe("allocateFifo — най-старите партиди първо", () => {
  it("разпределя по реда на доставка (FIFO)", () => {
    const batches = [b("B", 5, "2026-02-01"), b("A", 3, "2026-01-01"), b("C", 10, "2026-03-01")];
    const r = allocateFifo(batches, 6);
    expect(r.allocations).toEqual([{ batchId: "A", take: 3 }, { batchId: "B", take: 3 }]);
    expect(r.allocated).toBe(6);
    expect(r.shortfall).toBe(0);
  });
  it("отчита недостиг, ако партидите не стигат", () => {
    const r = allocateFifo([b("A", 2, "2026-01-01")], 5);
    expect(r.allocated).toBe(2);
    expect(r.shortfall).toBe(3);
  });
  it("пропуска изчерпани партиди (quantity 0)", () => {
    const r = allocateFifo([b("A", 0, "2026-01-01"), b("B", 4, "2026-02-01")], 3);
    expect(r.allocations).toEqual([{ batchId: "B", take: 3 }]);
  });
  it("празен списък → нула разпределено, целият недостиг", () => {
    const r = allocateFifo([], 4);
    expect(r.allocated).toBe(0);
    expect(r.shortfall).toBe(4);
  });
});

describe("freeQuantity — свободно = наличност − резервирано", () => {
  it("изважда резервираното", () => {
    expect(freeQuantity(10, 3)).toBe(7);
  });
  it("не пада под 0", () => {
    expect(freeQuantity(5, 8)).toBe(0);
  });
  it("отрицателно резервирано се третира като 0", () => {
    expect(freeQuantity(5, -2)).toBe(5);
  });
});

describe("batchExpiryStatus", () => {
  const now = new Date("2026-08-01T12:00:00Z");
  it("без срок → none", () => {
    expect(batchExpiryStatus(null, now).status).toBe("none");
  });
  it("минала дата → expired с отрицателни дни", () => {
    const r = batchExpiryStatus("2026-07-20", now);
    expect(r.status).toBe("expired");
    expect(r.days).toBeLessThan(0);
  });
  it("в рамките на прага (30 дни) → soon", () => {
    expect(batchExpiryStatus("2026-08-20", now).status).toBe("soon");
  });
  it("далечна дата → ok", () => {
    expect(batchExpiryStatus("2027-01-01", now).status).toBe("ok");
  });
  it("персонализиран праг", () => {
    expect(batchExpiryStatus("2026-08-20", now, 7).status).toBe("ok");
    expect(batchExpiryStatus("2026-08-05", now, 7).status).toBe("soon");
  });
});
