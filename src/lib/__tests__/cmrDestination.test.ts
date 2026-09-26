import { describe, it, expect } from "vitest";
import { buildDocumentData, shouldRegenerate, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

// Регресия: дестинацията в CMR (Epson/HP) идва от конкретната експортна доставка
// (source of truth), а НЕ от hardcode „SKOPIE". Bug пример: invoice 0000009741, SHTIP → SKOPIE.

const base: ExportSetSource = {
  invoiceNumber: "0000009741", invoiceDate: "2026-09-03T00:00:00.000Z", shipmentDate: "2026-09-03T00:00:00.000Z",
  destination: "SHTIP", destinationCountry: "North Macedonia", truckRegSnapshot: "ST8669AE", trailerReg: "ST5407AE",
  productSnapshot: "CEM II A-LL 42.5 R", customsCode: "25232900",
  quantity: 26.04, unit: "t", declarationCmrDate: null, dispatchNumber: "9741",
};
// Купувачът е в TETOVO — това НЕ трябва да става дестинация (§11).
const parties: Parties = {
  seller: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", city: "Kyustendil", country: "Bulgaria" },
  buyer: { name: "SEM INTERNATIONAL DOOEL", address: "55 Marshal Tito Str.", city: "Tetovo", country: "North Macedonia" },
  client: null,
};
const cmr = (src: ExportSetSource, type: "cmr_epson" | "cmr_hp") => buildDocumentData(src, parties, type) as Record<string, unknown>;

describe("CMR destination = export set destination (§1/§2/§6)", () => {
  it("1) Shtip → CMR Epson destination SHTIP", () => {
    expect(cmr(base, "cmr_epson").destination).toBe("SHTIP");
  });
  it("2) Shtip → CMR HP destination SHTIP", () => {
    expect(cmr(base, "cmr_hp").destination).toBe("SHTIP");
  });
  it("3) Kumanovo → both CMR = KUMANOVO", () => {
    const s = { ...base, destination: "Kumanovo" };
    expect(cmr(s, "cmr_epson").destination).toBe("KUMANOVO");
    expect(cmr(s, "cmr_hp").destination).toBe("KUMANOVO");
  });
  it("4) Kriva Palanka → KRIVA PALANKA (multi-word preserved)", () => {
    const s = { ...base, destination: "Kriva Palanka" };
    expect(cmr(s, "cmr_epson").destination).toBe("KRIVA PALANKA");
    expect(cmr(s, "cmr_hp").destination).toBe("KRIVA PALANKA");
  });
  it("legacy snapshot 'Скопие / FCA СКОПИЕ' → SKOPIE (term suffix stripped)", () => {
    const s = { ...base, destination: "Скопие / FCA СКОПИЕ" };
    expect(cmr(s, "cmr_hp").destination).toBe("SKOPIE");
  });
  it("dynamic for any city (no switch/case) — Vinica/Strumica/Tetovo as destination", () => {
    for (const [inp, out] of [["Vinica", "VINICA"], ["Strumica", "STRUMICA"], ["Tetovo", "TETOVO"]] as const) {
      expect(cmr({ ...base, destination: inp }, "cmr_epson").destination).toBe(out);
    }
  });
});

describe("CMR country (§5)", () => {
  it("5) country from destination master when present", () => {
    expect(cmr(base, "cmr_epson").destinationCountry).toBe("NORTH MACEDONIA");
    expect(cmr(base, "cmr_hp").destinationCountry).toBe("NORTH MACEDONIA");
  });
  it("falls back to buyer country when master country missing (not hardcoded blindly)", () => {
    const s = { ...base, destinationCountry: null };
    expect(cmr(s, "cmr_hp").destinationCountry).toBe("NORTH MACEDONIA");
  });
});

describe("buyer/consignee must NOT leak into destination (§11)", () => {
  it("6) buyer city Tetovo does not override destination SHTIP", () => {
    const e = cmr(base, "cmr_epson");
    expect(e.destination).toBe("SHTIP");
    expect(e.destination).not.toBe("TETOVO");
  });
  it("7) consignee keeps its own address/city; destination stays SHTIP", () => {
    const e = cmr(base, "cmr_epson") as { destination: string; consignee: { city?: string | null } };
    expect(e.consignee.city).toBe("Tetovo");
    expect(e.destination).toBe("SHTIP");
  });
});

describe("Epson and HP share one source-of-truth (§10/§15)", () => {
  it("15) both variants produce identical destination + country for the same set", () => {
    const e = cmr(base, "cmr_epson"), h = cmr(base, "cmr_hp");
    expect(e.destination).toBe(h.destination);
    expect(e.destinationCountry).toBe(h.destinationCountry);
  });
});

describe("regenerate / finalized safety (§8/§9/§12/§13)", () => {
  it("12) manual override not overwritten without force", () => {
    expect(shouldRegenerate({ status: "draft", overridden: true }, false)).toBe(false);
    expect(shouldRegenerate({ status: "draft", overridden: true }, true)).toBe(true);
  });
  it("13) finalized document never auto-regenerated (even with force)", () => {
    expect(shouldRegenerate({ status: "finalized", overridden: false }, false)).toBe(false);
    expect(shouldRegenerate({ status: "finalized", overridden: true }, true)).toBe(false);
  });
  it("plain draft regenerates (picks up corrected destination)", () => {
    expect(shouldRegenerate({ status: "draft", overridden: false }, false)).toBe(true);
    expect(shouldRegenerate(null, false)).toBe(true);
  });
});
