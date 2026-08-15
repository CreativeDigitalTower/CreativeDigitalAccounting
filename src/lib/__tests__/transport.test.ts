import { describe, it, expect } from "vitest";
import { milestoneState, shipmentDelayed, importDossierStatus } from "@/lib/logistics/transport";
import { REQUIRED_IMPORT_DOCS } from "@/lib/logistics/config";

const at = (h: number, m = 0) => { const d = new Date("2026-08-15T00:00:00Z"); d.setUTCHours(h, m, 0, 0); return d; };

describe("milestoneState", () => {
  it("реален час → confirmed", () => {
    expect(milestoneState({ expectedFrom: at(13), expectedTo: at(14), actualAt: at(15) }, at(20))).toBe("confirmed");
  });
  it("в диапазона, без реален час → pending", () => {
    expect(milestoneState({ expectedFrom: at(13), expectedTo: at(14), actualAt: null }, at(13, 30))).toBe("pending");
  });
  it("след горната граница + grace, без потвърждение → delayed (пример: граница 13:30–14:30, 16:00)", () => {
    expect(milestoneState({ expectedFrom: at(13, 30), expectedTo: at(14, 30), actualAt: null }, at(16), 90)).toBe("delayed");
  });
  it("непосредствено след крайния час, в рамките на grace → още pending (не delayed)", () => {
    expect(milestoneState({ expectedFrom: at(13, 30), expectedTo: at(14, 30), actualAt: null }, at(15), 90)).toBe("pending");
  });
  it("без очаквано и без реално → none", () => {
    expect(milestoneState({ expectedFrom: null, expectedTo: null, actualAt: null }, at(16))).toBe("none");
  });
});

describe("shipmentDelayed", () => {
  it("поне един закъснял етап → true", () => {
    expect(shipmentDelayed([
      { expectedFrom: at(8), expectedTo: at(9), actualAt: at(9) },
      { expectedFrom: at(13, 30), expectedTo: at(14, 30), actualAt: null },
    ], at(16), 90)).toBe(true);
  });
  it("всички потвърдени/в срок → false", () => {
    expect(shipmentDelayed([
      { expectedFrom: at(8), expectedTo: at(9), actualAt: at(9) },
      { expectedFrom: at(13), expectedTo: at(14), actualAt: null },
    ], at(13, 30), 90)).toBe(false);
  });
});

describe("importDossierStatus", () => {
  it("всички изисквани налични → complete", () => {
    const r = importDossierStatus(REQUIRED_IMPORT_DOCS);
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
  });
  it("липсва документ → incomplete + списък липсващи", () => {
    const r = importDossierStatus(["cmr", "customs_declaration"]);
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("export_doc");
    expect(r.missing).toContain("import_doc");
    expect(r.items.find((i) => i.docType === "cmr")?.present).toBe(true);
  });
  it("празно → всички липсват", () => {
    const r = importDossierStatus([]);
    expect(r.missing.length).toBe(REQUIRED_IMPORT_DOCS.length);
  });
});
