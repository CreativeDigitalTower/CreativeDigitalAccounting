import { describe, it, expect } from "vitest";
import { computeNet, validateShipmentCore } from "@/lib/logistics/shipmentCalc";
import { formatShipmentId, SHIPMENT_STATUSES, DEFAULT_SHIPMENT_STATUS, isValidShipmentStatus } from "@/lib/logistics/config";

describe("computeNet", () => {
  it("нето = бруто − тара (реалният пример 39.12 − 12.98 = 26.14)", () => {
    expect(computeNet(39.12, 12.98)).toBe(26.14);
  });
  it("явно подадено нето има приоритет", () => {
    expect(computeNet(39.12, 12.98, 26.0)).toBe(26.0);
  });
  it("липсва бруто/тара → null", () => {
    expect(computeNet(null, 12.98)).toBe(null);
    expect(computeNet(39.12, null)).toBe(null);
  });
  it("тара ≥ бруто → null (некоректно)", () => {
    expect(computeNet(10, 12)).toBe(null);
    expect(computeNet(12, 12)).toBe(null);
  });
  it("закръгля до 3 знака", () => {
    expect(computeNet(26.1409, 0.0002)).toBe(26.141);
  });
});

describe("validateShipmentCore (критични полета)", () => {
  const ok = { dispatchDate: "2026-08-14", vehicleId: "v1", productId: "p1", netQuantity: 26.14 };
  it("валиден вход", () => { expect(validateShipmentCore(ok).ok).toBe(true); });
  it("липсва дата", () => { expect(validateShipmentCore({ ...ok, dispatchDate: null }).ok).toBe(false); });
  it("липсва автомобил (нито id, нито рег)", () => { expect(validateShipmentCore({ ...ok, vehicleId: null }).ok).toBe(false); });
  it("автомобил само чрез рег. номер минава", () => { expect(validateShipmentCore({ ...ok, vehicleId: null, vehicleReg: "CB0638AT" }).ok).toBe(true); });
  it("липсва продукт", () => { expect(validateShipmentCore({ ...ok, productId: null }).ok).toBe(false); });
  it("нулево/отрицателно количество", () => {
    expect(validateShipmentCore({ ...ok, netQuantity: 0 }).ok).toBe(false);
    expect(validateShipmentCore({ ...ok, netQuantity: -5 }).ok).toBe(false);
  });
});

describe("shipment ID + статуси", () => {
  it("TR-YYYY-000001 формат", () => {
    expect(formatShipmentId(2026, 1)).toBe("TR-2026-000001");
    expect(formatShipmentId(2026, 184)).toBe("TR-2026-000184");
  });
  it("статусът по подразбиране е loaded (натоварен/очаква фактура)", () => {
    expect(DEFAULT_SHIPMENT_STATUS).toBe("loaded");
    expect(SHIPMENT_STATUSES).toContain("loaded");
  });
  it("13 статуса в workflow-а", () => {
    expect(SHIPMENT_STATUSES.length).toBe(13);
    expect(SHIPMENT_STATUSES[0]).toBe("planned");
    expect(SHIPMENT_STATUSES[SHIPMENT_STATUSES.length - 1]).toBe("completed");
  });
  it("валидиране на статус", () => {
    expect(isValidShipmentStatus("customs")).toBe(true);
    expect(isValidShipmentStatus("banana")).toBe(false);
  });
});
