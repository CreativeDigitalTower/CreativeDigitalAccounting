import { describe, it, expect } from "vitest";
import { CATEGORIES, getCategory, getTemplate, isCategoryVisibleTo, visibleCategories, canAccessTemplate } from "@/lib/businessDocs/templates";

describe("business-docs entitlement (видимост по ЕИК)", () => {
  const RESTRICTED_EIK = "204618149";

  it("категорията „acceptance\" е ограничена до конкретен ЕИК", () => {
    const cat = getCategory("acceptance");
    expect(cat).toBeTruthy();
    expect(cat!.restrictToEiks).toContain(RESTRICTED_EIK);
  });

  it("ограничена категория се вижда само от правоимащата фирма", () => {
    const cat = getCategory("acceptance")!;
    expect(isCategoryVisibleTo(cat, RESTRICTED_EIK)).toBe(true);
    expect(isCategoryVisibleTo(cat, "999999999")).toBe(false);
    expect(isCategoryVisibleTo(cat, null)).toBe(false);
  });

  it("публичните категории се виждат от всички", () => {
    const contracts = getCategory("contracts")!;
    expect(isCategoryVisibleTo(contracts, null)).toBe(true);
    expect(isCategoryVisibleTo(contracts, "999999999")).toBe(true);
  });

  it("visibleCategories крие ограничените за чужди фирми", () => {
    const forOther = visibleCategories("999999999").map((c) => c.id);
    expect(forOther).not.toContain("acceptance");
    const forOwner = visibleCategories(RESTRICTED_EIK).map((c) => c.id);
    expect(forOwner).toContain("acceptance");
  });

  it("двата шаблона съществуват и са достъпни само за правоимащия", () => {
    expect(getTemplate("acceptance-1")?.title).toBe("Приемо-предавателен протокол");
    expect(getTemplate("acceptance-2")?.title).toContain("ДДД");
    expect(canAccessTemplate("acceptance-1", RESTRICTED_EIK)).toBe(true);
    expect(canAccessTemplate("acceptance-2", "999999999")).toBe(false);
  });

  it("общият брой публични категории е стабилен (acceptance е единствената ограничена)", () => {
    const restricted = CATEGORIES.filter((c) => c.restrictToEiks && c.restrictToEiks.length);
    expect(restricted.map((c) => c.id)).toEqual(["acceptance"]);
  });
});
