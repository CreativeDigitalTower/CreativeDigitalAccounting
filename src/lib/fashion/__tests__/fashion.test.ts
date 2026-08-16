import { describe, it, expect } from "vitest";
import { canFashion, fashionCaps, effectiveFashionRole, FASHION_PERMISSIONS } from "@/lib/fashion/perms";
import { FASHION_MODULE_KEY, FASHION_DEFAULTS, formatFashionNumber, FASHION_NAV, FASHION_SEQ_SCOPE } from "@/lib/fashion/config";

describe("Fashion Production — модул/конфигурация (Phase 1)", () => {
  it("модулен ключ и база са стабилни (database-driven активиране)", () => {
    expect(FASHION_MODULE_KEY).toBe("fashion_production");
    expect(FASHION_NAV[0].key).toBe("dashboard");
    expect(FASHION_NAV.length).toBe(15);
  });

  it("настройките по подразбиране са weighted average + без отрицателна наличност", () => {
    expect(FASHION_DEFAULTS.costingMethod).toBe("weighted_average");
    expect(FASHION_DEFAULTS.allowNegativeStock).toBe(false);
    expect(FASHION_DEFAULTS.defaultCurrency).toBe("EUR");
  });

  it("формат на документен номер: CUT-2026-000042", () => {
    expect(formatFashionNumber("CUT", 2026, 42)).toBe("CUT-2026-000042");
    expect(formatFashionNumber("PRD", 2026, 1)).toBe("PRD-2026-000001");
    expect(FASHION_SEQ_SCOPE.cutting).toBe("fashion_cutting");
  });
});

describe("Fashion Production — права по роля (§34)", () => {
  it("owner има всички права", () => {
    for (const p of FASHION_PERMISSIONS) expect(canFashion("owner", p)).toBe(true);
  });

  it("липса на роля → без достъп (фирма без активен модул/член)", () => {
    for (const p of FASHION_PERMISSIONS) expect(canFashion(null, p)).toBe(false);
    expect(canFashion(undefined, "view_fashion")).toBe(false);
  });

  it("Super Admin → owner (пълен достъп)", () => {
    expect(effectiveFashionRole(true, null)).toBe("owner");
    expect(effectiveFashionRole(false, "warehouse")).toBe("warehouse");
    expect(effectiveFashionRole(false, null)).toBe(null);
  });

  it("costing/margin е ограничен: warehouse не вижда себестойност, accountant — да", () => {
    expect(canFashion("warehouse", "view_costing")).toBe(false);
    expect(canFashion("warehouse", "manage_costing")).toBe(false);
    expect(canFashion("accountant", "view_costing")).toBe(true);
    expect(canFashion("accountant", "manage_production")).toBe(false);
  });

  it("warehouse оператор управлява цех, но не настройки/продажби-репорти", () => {
    expect(canFashion("warehouse", "manage_cutting")).toBe(true);
    expect(canFashion("warehouse", "manage_qc")).toBe(true);
    expect(canFashion("warehouse", "manage_settings")).toBe(false);
    expect(canFashion("warehouse", "manage_sales_reports")).toBe(false);
  });

  it("viewer вижда само модула и анализите", () => {
    expect(canFashion("viewer", "view_fashion")).toBe(true);
    expect(canFashion("viewer", "view_analytics")).toBe(true);
    expect(canFashion("viewer", "manage_materials")).toBe(false);
  });

  it("employee (базова роля) няма достъп до модула", () => {
    expect(canFashion("employee", "view_fashion")).toBe(false);
  });

  it("fashionCaps връща пълна матрица булеви права", () => {
    const caps = fashionCaps("sales");
    expect(caps.manage_sales_reports).toBe(true);
    expect(caps.view_analytics).toBe(true);
    expect(caps.manage_cutting).toBe(false);
    expect(Object.keys(caps).length).toBe(FASHION_PERMISSIONS.length);
  });
});
