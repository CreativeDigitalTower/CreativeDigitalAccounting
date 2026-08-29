import { describe, it, expect } from "vitest";
import { CEMENT_CATALOG, LEGACY_DEFAULT_NAMES, CANONICAL_KEYS, LEGACY_KEYS, classifyProduct, missingCanonical } from "@/lib/logistics/cementCatalog";
import { normalizeProductKey } from "@/lib/logistics/normalize";

describe("cement catalog — canonical set (1/5/24)", () => {
  const bulk = CEMENT_CATALOG.filter((p) => p.category === "bulk");
  const packaged = CEMENT_CATALOG.filter((p) => p.category === "packaged");
  it("exactly 3 BULK products", () => { expect(bulk.length).toBe(3); });
  it("exactly 3 PACKAGED products", () => { expect(packaged.length).toBe(3); });
  it("bulk names match spec exactly (B0LL preserved)", () => {
    expect(bulk.map((p) => p.canonicalName)).toEqual(["CEM II A-LL 52.5 N", "CEM II A-LL 42.5 R", "CEM II B0LL 52.5 N"]);
  });
  it("packaged names match spec exactly", () => {
    expect(packaged.map((p) => p.canonicalName)).toEqual(["CEM II B-LL 42.5 R", "CEM II B-LL 32.5 R", "CEM II C-M V-LL 42.5 N"]);
  });
  it("B0LL and B-LL 52.5 do NOT collide on normalized key", () => {
    expect(normalizeProductKey("CEM II B0LL 52.5 N")).not.toBe(normalizeProductKey("CEM II B-LL 52.5 N"));
  });
  it("canonical keys are all distinct", () => {
    expect(CANONICAL_KEYS.size).toBe(6);
  });
  it("legacy default names are disjoint from canonical", () => {
    for (const k of LEGACY_KEYS) expect(CANONICAL_KEYS.has(k)).toBe(false);
  });
});

describe("cement catalog — sync classification (16/17/24)", () => {
  it("canonical missing -> CREATE", () => {
    expect(classifyProduct({ normalizedName: normalizeProductKey("CEM II B0LL 52.5 N"), existsActive: null })).toBe("CREATE");
  });
  it("canonical present -> KEEP (idempotent second run)", () => {
    expect(classifyProduct({ normalizedName: normalizeProductKey("CEM II A-LL 42.5 R"), existsActive: true })).toBe("KEEP");
  });
  it("known old default, active -> ARCHIVE", () => {
    expect(classifyProduct({ normalizedName: normalizeProductKey("DEGASET"), existsActive: true })).toBe("ARCHIVE");
  });
  it("custom product -> SKIP (never archived)", () => {
    expect(classifyProduct({ normalizedName: normalizeProductKey("CEM TEST NEW"), existsActive: true })).toBe("SKIP");
  });
  it("already-archived legacy -> not re-archived (ARCHIVE only when active)", () => {
    expect(classifyProduct({ normalizedName: normalizeProductKey("CEM I 52.5 R"), existsActive: false })).toBe("SKIP");
  });
  it("missingCanonical reports absent canonical products", () => {
    const present = [normalizeProductKey("CEM II A-LL 52.5 N"), normalizeProductKey("CEM II A-LL 42.5 R")];
    const missing = missingCanonical(present).map((p) => p.canonicalName);
    expect(missing).toContain("CEM II B0LL 52.5 N");
    expect(missing).not.toContain("CEM II A-LL 52.5 N");
    expect(missing.length).toBe(4);
  });
  it("LEGACY_DEFAULT_NAMES excludes any canonical name", () => {
    const canon = new Set(CEMENT_CATALOG.map((p) => p.canonicalName));
    for (const n of LEGACY_DEFAULT_NAMES) expect(canon.has(n)).toBe(false);
  });
});
