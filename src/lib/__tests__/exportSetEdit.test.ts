import { describe, it, expect } from "vitest";
import { missingEditFields, exportDeleteDecision, setVisibleInView } from "@/lib/logistics/exportSetEdit";
import { parseQuantity, fmtQuantity } from "@/lib/i18n/format";

describe("export edit — partial required-field validation (18/27)", () => {
  it("empty payload is valid (nothing being cleared)", () => {
    expect(missingEditFields({})).toEqual([]);
  });
  it("flags a field only when it is provided AND emptied", () => {
    expect(missingEditFields({ destination: "" })).toEqual(["destination"]);
    expect(missingEditFields({ deliveryTerm: null })).toEqual(["deliveryTerm"]);
    expect(missingEditFields({ quantity: 0 })).toEqual(["quantity"]);
    expect(missingEditFields({ quantity: -5 })).toEqual(["quantity"]);
    expect(missingEditFields({ logisticsProductId: "" })).toEqual(["logisticsProductId"]);
    expect(missingEditFields({ truckVehicleId: "" })).toEqual(["truckVehicleId"]);
    expect(missingEditFields({ placeOfShipment: "  " })).toEqual(["placeOfShipment"]);
    expect(missingEditFields({ invoiceNumber: "" })).toEqual(["invoiceNumber"]);
  });
  it("valid provided values pass", () => {
    expect(missingEditFields({ invoiceNumber: "0000009617", deliveryTerm: "FCA", destination: "TETOVO", placeOfShipment: "BELI IZVOR", quantity: 26.36, logisticsProductId: "p1", truckVehicleId: "v1" })).toEqual([]);
  });
  it("fields absent from payload are never flagged", () => {
    expect(missingEditFields({ quantity: 26.36 })).toEqual([]);
  });
});

describe("export delete — MK invoice guard (4/6)", () => {
  it("blocks when an MK invoice is linked", () => {
    expect(exportDeleteDecision({ hasMkInvoice: true })).toEqual({ ok: false, reason: "mk_invoice_linked" });
  });
  it("allows when no MK invoice is linked", () => {
    expect(exportDeleteDecision({ hasMkInvoice: false })).toEqual({ ok: true });
  });
});

describe("export soft-delete visibility (7/30)", () => {
  it("active view shows non-deleted only", () => {
    expect(setVisibleInView({ deletedAt: null }, "active")).toBe(true);
    expect(setVisibleInView({ deletedAt: new Date() }, "active")).toBe(false);
  });
  it("trash view shows deleted only", () => {
    expect(setVisibleInView({ deletedAt: new Date() }, "trash")).toBe(true);
    expect(setVisibleInView({ deletedAt: null }, "trash")).toBe(false);
  });
});

describe("export edit — quantity keeps 3 decimals (14)", () => {
  it("parse then format round-trips to 3 decimals", () => {
    expect(fmtQuantity(parseQuantity("26,360"), "bg")).toBe("26,360");
    expect(fmtQuantity(parseQuantity("30"), "en")).toBe("30.000");
    expect(fmtQuantity(parseQuantity("23.8"), "en")).toBe("23.800");
  });
});
