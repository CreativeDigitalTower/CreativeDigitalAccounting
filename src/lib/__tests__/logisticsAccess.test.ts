import { describe, it, expect } from "vitest";
import { canLogistics, logisticsCaps } from "@/lib/logistics/perms";
import { formatShipmentId, LOGISTICS_DEFAULTS, SEQ_SCOPE, LOGISTICS_MODULE_KEY } from "@/lib/logistics/config";

describe("logistics config", () => {
  it("module key е logistics", () => {
    expect(LOGISTICS_MODULE_KEY).toBe("logistics");
  });
  it("defaults: EUR/MKD и MK ДДВ 18% (конфигурируем)", () => {
    expect(LOGISTICS_DEFAULTS.bgCurrency).toBe("EUR");
    expect(LOGISTICS_DEFAULTS.mkCurrency).toBe("MKD");
    expect(LOGISTICS_DEFAULTS.mkVatRate).toBe(18);
  });
  it("shipment ID формат TR-YYYY-000001", () => {
    expect(formatShipmentId(2026, 1)).toBe("TR-2026-000001");
    expect(formatShipmentId(2026, 184)).toBe("TR-2026-000184");
    expect(formatShipmentId(2026, 1234567)).toBe("TR-2026-1234567");
  });
  it("scope-овете са дефинирани", () => {
    expect(SEQ_SCOPE.shipment).toBe("shipment");
    expect(SEQ_SCOPE.bgMkInvoice).toBe("bg_mk_invoice");
  });
});

describe("права по роля (logistics)", () => {
  it("owner има всичко", () => {
    const c = logisticsCaps("owner");
    expect(Object.values(c).every(Boolean)).toBe(true);
  });
  it("viewer само преглед/анализи", () => {
    expect(canLogistics("viewer", "view_logistics")).toBe(true);
    expect(canLogistics("viewer", "view_analytics")).toBe(true);
    expect(canLogistics("viewer", "manage_shipments")).toBe(false);
    expect(canLogistics("viewer", "manage_invoices")).toBe(false);
  });
  it("accountant управлява документи/фактури, но не курсове", () => {
    expect(canLogistics("accountant", "manage_invoices")).toBe(true);
    expect(canLogistics("accountant", "manage_shipments")).toBe(false);
  });
  it("sales управлява курсове/документи, но не фактури/ставки", () => {
    expect(canLogistics("sales", "manage_shipments")).toBe(true);
    expect(canLogistics("sales", "manage_invoices")).toBe(false);
    expect(canLogistics("sales", "manage_rates")).toBe(false);
  });
  it("employee/непозната роля/липса — без достъп", () => {
    expect(canLogistics("employee", "view_logistics")).toBe(false);
    expect(canLogistics(null, "view_logistics")).toBe(false);
    expect(canLogistics("ghost", "view_logistics")).toBe(false);
  });
});
