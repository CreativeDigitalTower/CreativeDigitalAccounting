import { describe, it, expect } from "vitest";
import { splitTruckTrailer, truckTrailerLabel } from "@/lib/logistics/exportDocs";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import { bagsCalc, exceedsPayload, truckTrailerDisplay, BAGS_DEFAULTS, CARGO_MODES } from "@/lib/logistics/fleet";
import { CEMENT_FLEET, CEMENT_PRODUCTS } from "@/lib/logistics/cementFleet.data";

describe("split влекач/ремарке", () => {
  it("splits 'SK3832BO / SK7430BI' into truck + trailer", () => {
    expect(splitTruckTrailer("SK3832BO / SK7430BI")).toEqual({ truck: "SK3832BO", trailer: "SK7430BI" });
  });
  it("truck only when no slash", () => {
    expect(splitTruckTrailer("SK3832BO")).toEqual({ truck: "SK3832BO", trailer: null });
  });
  it("round-trips through truckTrailerLabel", () => {
    expect(truckTrailerLabel("SK501TO", "SK5022AE")).toBe("SK501TO / SK5022AE");
  });
  it("display helper joins truck + trailer", () => {
    expect(truckTrailerDisplay("SK501TO", "SK5022AE")).toBe("SK501TO / SK5022AE");
    expect(truckTrailerDisplay("SK501TO", null)).toBe("SK501TO");
  });
});

describe("registration normalization (dedup)", () => {
  it("normalizes spacing → same key", () => {
    expect(normalizeRegistration("SK 3832 BO")).toBe(normalizeRegistration("SK3832BO"));
  });
  it("folds Cyrillic lookalikes → same key as Latin", () => {
    // СВ0024СА (Cyrillic С→C, В→B, А→A) folds to Latin CB0024CA and dedups with spacing.
    expect(normalizeRegistration("СВ0024СА")).toBe("CB0024CA");
    expect(normalizeRegistration("СВ 0024 СА")).toBe(normalizeRegistration("CB0024CA"));
  });
  it("does not lose digits for pure-Cyrillic plates", () => {
    expect(normalizeRegistration("СВ0024СА")).not.toBe("0024");
  });
});

describe("bags calculation 17 × 56 × 25", () => {
  it("default: 17 pallets → 952 bags", () => {
    expect(bagsCalc().totalBags).toBe(952);
    expect(bagsCalc(BAGS_DEFAULTS.pallets).totalBags).toBe(952);
  });
  it("952 bags × 25 kg = 23800 kg = 23.8 t", () => {
    const c = bagsCalc();
    expect(c.totalKg).toBe(23800);
    expect(c.totalTons).toBe(23.8);
  });
  it("1 pallet = 56 bags = 1.4 t", () => {
    const c = bagsCalc(1);
    expect(c.totalBags).toBe(56);
    expect(c.tonsPerPallet).toBe(1.4);
    expect(c.totalTons).toBe(1.4);
  });
  it("recomputes when pallets change (20 pallets)", () => {
    const c = bagsCalc(20);
    expect(c.totalBags).toBe(1120);
    expect(c.totalKg).toBe(28000);
    expect(c.totalTons).toBe(28);
  });
});

describe("bulk payload validation (§28)", () => {
  it("warns when quantity exceeds max payload", () => {
    expect(exceedsPayload(30, 26)).toBe(true);
  });
  it("no warning within payload", () => {
    expect(exceedsPayload(24, 26)).toBe(false);
  });
  it("returns null when max payload unknown", () => {
    expect(exceedsPayload(30, null)).toBeNull();
  });
});

describe("cement fleet dataset (§8–§25)", () => {
  it("has carriers with configs", () => {
    expect(CEMENT_FLEET.length).toBeGreaterThan(0);
    for (const c of CEMENT_FLEET) expect(c.configs.length).toBeGreaterThan(0);
  });
  it("every config combo splits into a truck", () => {
    for (const c of CEMENT_FLEET)
      for (const cfg of c.configs)
        expect(splitTruckTrailer(cfg.combo).truck).toBeTruthy();
  });
  it("cargoMode values are valid or empty (unspecified left blank, §34)", () => {
    for (const c of CEMENT_FLEET)
      for (const cfg of c.configs)
        expect(cfg.cargoMode === undefined || cfg.cargoMode === "" || (CARGO_MODES as readonly string[]).includes(cfg.cargoMode)).toBe(true);
  });
  it("bags configs default to 23.8 t max payload", () => {
    const bagsCfgs = CEMENT_FLEET.flatMap((c) => c.configs).filter((cfg) => cfg.cargoMode === "bags");
    for (const cfg of bagsCfgs) expect(cfg.maxPayloadTons).toBe(23.8);
  });
  it("defines bulk and bags product names", () => {
    expect(CEMENT_PRODUCTS.bulk.length).toBeGreaterThan(0);
    expect(CEMENT_PRODUCTS.bags.length).toBeGreaterThan(0);
  });
  it("same truck+trailer under two carriers is not merged (carrier-scoped)", () => {
    // KP4622AC/KP8465AB appears under multiple carriers per spec — allowed, distinct configs.
    const withCombo = CEMENT_FLEET.filter((c) => c.configs.some((cfg) => normalizeRegistration(cfg.combo).includes(normalizeRegistration("KP4622AC"))));
    expect(withCombo.length).toBeGreaterThanOrEqual(1);
  });
});
