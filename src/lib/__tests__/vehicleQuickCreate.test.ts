import { describe, it, expect } from "vitest";
import { isNewVehicleRegistration, buildVehicleQuickCreatePayload } from "@/lib/logistics/vehicleQuickCreate";
import { normalizeRegistration } from "@/lib/logistics/normalize";
import fs from "node:fs";

describe("creatable vehicle selector (2/6)", () => {
  const ids = ["veh1", "veh2"];
  it("unknown typed registration -> new (shows create option)", () => {
    expect(isNewVehicleRegistration("SK454Y", ids)).toBe(true);
  });
  it("existing vehicle id -> not new (select existing)", () => {
    expect(isNewVehicleRegistration("veh1", ids)).toBe(false);
  });
  it("empty / whitespace -> not new", () => {
    expect(isNewVehicleRegistration("", ids)).toBe(false);
    expect(isNewVehicleRegistration("   ", ids)).toBe(false);
  });
});

describe("quick-create payload (12/20)", () => {
  it("only registration required; optional fields default null/unspecified", () => {
    expect(buildVehicleQuickCreatePayload({ registration: "SK454Y" })).toEqual({
      registration: "SK454Y", trailerReg: null, carrierId: null, defaultDriver: null, ownershipType: "unspecified",
    });
  });
  it("trims leading/trailing spaces on registration and trailer (20)", () => {
    const p = buildVehicleQuickCreatePayload({ registration: "  SK454Y  ", trailerReg: "  SK5022AE " });
    expect(p.registration).toBe("SK454Y");
    expect(p.trailerReg).toBe("SK5022AE");
  });
  it("passes carrier id and ownership through", () => {
    const p = buildVehicleQuickCreatePayload({ registration: "SK1", carrierId: "car1", defaultDriver: "Ivan", ownershipType: "own" });
    expect(p.carrierId).toBe("car1");
    expect(p.defaultDriver).toBe("Ivan");
    expect(p.ownershipType).toBe("own");
  });
  it("registration normalization treats format variants as one (5/33)", () => {
    // Cyrillic/Latin lookalikes + spaces/hyphens fold to the same key (dedup at API).
    expect(normalizeRegistration("CB1234AB")).toBe(normalizeRegistration("CB 1234 AB"));
    expect(normalizeRegistration("CB1234AB")).toBe(normalizeRegistration("СВ1234АВ"));
  });
});

describe("i18n parity — vehicleCreate namespace (35)", () => {
  const langs = ["bg", "en", "ru", "ro", "tr", "el"];
  const load = (l: string) => JSON.parse(fs.readFileSync(`src/locales/${l}/logistics.json`, "utf-8")).vehicleCreate ?? {};
  const base = Object.keys(load("bg"));
  it("all languages have the full vehicleCreate key set, no raw keys", () => {
    expect(base.length).toBeGreaterThan(5);
    for (const l of langs) {
      const k = load(l);
      for (const key of base) { expect(k[key], `${l}.${key}`).toBeTruthy(); expect(String(k[key]).startsWith("logistics.")).toBe(false); }
    }
  });
});
