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

import { classifyReset } from "@/lib/logistics/cementCatalog";

describe("cement catalog — full reset classification (2/19/25)", () => {
  const key = (n: string) => normalizeProductKey(n);
  it("reset yields exactly six canonical products", () => { expect(CEMENT_CATALOG.length).toBe(6); });
  it("no canonical product is uncategorized (only bulk/packaged, 4/5)", () => {
    for (const p of CEMENT_CATALOG) expect(["bulk", "packaged"]).toContain(p.category);
  });
  it("known material codes preserved (14)", () => {
    const byName = Object.fromEntries(CEMENT_CATALOG.map((p) => [p.canonicalName, p.materialCode]));
    expect(byName["CEM II A-LL 42.5 R"]).toBe("14008014");
    expect(byName["CEM II A-LL 52.5 N"]).toBe("14012840");
    expect(byName["CEM II B0LL 52.5 N"]).toBeNull();
  });
  it("old non-canonical product -> DELETE", () => {
    expect(classifyReset({ normalizedName: key("CEM II B-V 52.5 N"), exists: true })).toBe("DELETE");
    expect(classifyReset({ normalizedName: key("CEM II 42.5 R"), exists: true })).toBe("DELETE");
    expect(classifyReset({ normalizedName: key("CEM IV B(V) 42.5 N"), exists: true })).toBe("DELETE");
  });
  it("canonical missing -> CREATE, present -> UPDATE (idempotent rerun)", () => {
    expect(classifyReset({ normalizedName: key("CEM II B0LL 52.5 N"), exists: false })).toBe("CREATE");
    expect(classifyReset({ normalizedName: key("CEM II A-LL 42.5 R"), exists: true })).toBe("UPDATE");
  });
  it("first reset purges custom too; --keep-custom protects user products (21)", () => {
    expect(classifyReset({ normalizedName: key("CEM TEST NEW"), exists: true, isSystemDefault: false })).toBe("DELETE");
    expect(classifyReset({ normalizedName: key("CEM TEST NEW"), exists: true, isSystemDefault: false }, { keepCustom: true })).toBe("KEEP_CUSTOM");
  });
  it("--keep-custom still deletes legacy system defaults", () => {
    expect(classifyReset({ normalizedName: key("DEGASET"), exists: true, isSystemDefault: true }, { keepCustom: true })).toBe("DELETE");
  });
});
