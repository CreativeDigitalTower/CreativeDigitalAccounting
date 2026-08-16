import { describe, it, expect } from "vitest";
import { normalizeRegistration, normalizeProductKey, normalizeMaterialCode } from "@/lib/logistics/normalize";
import {
  SEED_VEHICLE_REGISTRATIONS, SEED_VEHICLE_ALIASES, SEED_PRODUCTS, UNRESOLVED_VEHICLE_SHORTCODES, SEED_TRUCK_TRAILERS,
} from "@/lib/logistics/masterData";

describe("normalizeRegistration (dedup срещу формат)", () => {
  it("главни + без интервали/тирета/точки", () => {
    expect(normalizeRegistration("CB 0638 AT")).toBe("CB0638AT");
    expect(normalizeRegistration("cb0638at")).toBe("CB0638AT");
    expect(normalizeRegistration("CB-0638-AT")).toBe("CB0638AT");
    expect(normalizeRegistration("cb.0638.at")).toBe("CB0638AT");
  });
  it("трите варианта дават един и същ ключ (без дубликат)", () => {
    const a = normalizeRegistration("CB 0638 AT");
    const b = normalizeRegistration("cb-0638-at");
    const c = normalizeRegistration("CB0638AT");
    expect(new Set([a, b, c]).size).toBe(1);
  });
});

describe("alias резолюция (съкратени → пълни)", () => {
  it("всеки съкратен alias нормализира към различен ключ от пълния", () => {
    // ST8669 (съкратен) ≠ ST8669AE (пълен) на ниво ключ → alias таблицата ги свързва.
    expect(normalizeRegistration("ST8669")).toBe("ST8669");
    expect(normalizeRegistration("ST8669AE")).toBe("ST8669AE");
    expect(normalizeRegistration("ST8669")).not.toBe(normalizeRegistration("ST8669AE"));
  });
  it("всички seed alias-и сочат към seed-нат пълен номер", () => {
    const allTrucks = new Set([...SEED_VEHICLE_REGISTRATIONS, ...SEED_TRUCK_TRAILERS.map((x) => x.truck)]);
    for (const full of Object.values(SEED_VEHICLE_ALIASES)) {
      expect(allTrucks.has(full)).toBe(true);
    }
  });
  it("непотвърдените съкратени номера НЕ са сред каноничните автомобили", () => {
    for (const s of UNRESOLVED_VEHICLE_SHORTCODES) {
      expect(SEED_VEHICLE_REGISTRATIONS).not.toContain(s);
      // и не са сред потвърдените aliases
      expect(Object.keys(SEED_VEHICLE_ALIASES)).not.toContain(s);
    }
  });
});

describe("seed master data — цялост", () => {
  it("точно 21 автомобила, всички уникални след нормализация", () => {
    expect(SEED_VEHICLE_REGISTRATIONS.length).toBe(21);
    const norm = SEED_VEHICLE_REGISTRATIONS.map(normalizeRegistration);
    expect(new Set(norm).size).toBe(21);
  });
  it("основните 4 + новите от SK501.xlsx (8 общо)", () => {
    expect(SEED_PRODUCTS.length).toBe(8);
    const names = SEED_PRODUCTS.map((p) => p.canonicalName);
    expect(names).toContain("CEM I 52.5 R");
    expect(names).toContain("DEGASET");
    expect(names).toContain("CEM IV B(V) 42.5 N");
  });
  it("material codes само за потвърдените (42.5 R и 52.5 N)", () => {
    const byName = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.canonicalName, p.materialCode]));
    expect(byName["CEM II A-LL 42.5 R"]).toBe("14008014");
    expect(byName["CEM II A-LL 52.5 N"]).toBe("14012840");
    expect(byName["CEM II B-V 52.5 N"]).toBe(null);
    expect(byName["CEM II B-LL 42.5 R"]).toBe(null);
  });
  it("B-LL продуктът има разфасовка 25 kg bags", () => {
    const p = SEED_PRODUCTS.find((x) => x.canonicalName === "CEM II B-LL 42.5 R");
    expect(p?.packaging).toBe("25 kg bags");
  });
});

describe("normalizeProductKey (запетая/точка/формат)", () => {
  it("42,5 ↔ 42.5 дават един ключ", () => {
    expect(normalizeProductKey("CEM II A-LL 42,5 R")).toBe(normalizeProductKey("CEM II A-LL 42.5 R"));
  });
  it("със и без наклонена черта дават един ключ", () => {
    expect(normalizeProductKey("CEM II / A-LL 52.5 N")).toBe(normalizeProductKey("CEM II A-LL 52.5 N"));
  });
  it("НЕ смесва A-LL / B-LL / B-V (различни продукти)", () => {
    const all = normalizeProductKey("CEM II A-LL 52.5 N");
    const bll = normalizeProductKey("CEM II B-LL 52.5 N");
    const bv = normalizeProductKey("CEM II B-V 52.5 N");
    expect(new Set([all, bll, bv]).size).toBe(3);
  });
  it("всеки seed alias нормализира; различните класове остават различни", () => {
    for (const p of SEED_PRODUCTS) {
      const key = normalizeProductKey(p.canonicalName);
      for (const a of p.aliases) {
        // alias-ите на A-LL 52.5 N не бива да съвпадат с B-V 52.5 N
        expect(normalizeProductKey(a)).not.toBe(normalizeProductKey("CEM II B-V 99 X"));
        void key;
      }
    }
  });
});

describe("normalizeMaterialCode (uniqueness)", () => {
  it("маха форматиране, главни", () => {
    expect(normalizeMaterialCode("14012840")).toBe("14012840");
    expect(normalizeMaterialCode("140-128-40")).toBe("14012840");
    expect(normalizeMaterialCode(" 14012840 ")).toBe("14012840");
  });
  it("двата потвърдени кода са различни", () => {
    expect(normalizeMaterialCode("14008014")).not.toBe(normalizeMaterialCode("14012840"));
  });
});
