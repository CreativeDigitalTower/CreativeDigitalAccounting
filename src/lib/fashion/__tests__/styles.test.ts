import { describe, it, expect } from "vitest";
import {
  STYLE_STATUSES, PATTERN_STATUSES, parseList, buildVariantSku, nextPatternVersion,
} from "@/lib/fashion/styles";

describe("Fashion Styles — статуси и SKU (Phase 3)", () => {
  it("статусите на модела покриват целия workflow (idea→archived)", () => {
    expect(STYLE_STATUSES[0]).toBe("idea");
    expect(STYLE_STATUSES).toContain("ready_for_production");
    expect(STYLE_STATUSES[STYLE_STATUSES.length - 1]).toBe("archived");
    expect(PATTERN_STATUSES).toEqual(["draft", "approved", "archived"]);
  });

  it("parseList нормализира свободен списък без дубликати", () => {
    expect(parseList("S, M, L")).toEqual(["S", "M", "L"]);
    expect(parseList("Black,black, White")).toEqual(["Black", "White"]);
    expect(parseList("")).toEqual([]);
    expect(parseList(null)).toEqual([]);
  });

  it("buildVariantSku: EX-SD + Black + S → EX-SD-BLK-S (§17)", () => {
    expect(buildVariantSku("EX-SD", "Black", "S")).toBe("EX-SD-BLK-S");
    expect(buildVariantSku("EX-SD", "White", "M")).toBe("EX-SD-WHT-M");
    expect(buildVariantSku("ex-sd", "red", "xl")).toBe("EX-SD-RED-XL");
    expect(buildVariantSku("EX-SD", null, "S")).toBe("EX-SD-S");
    expect(buildVariantSku("EX-SD", "Carvico", "L")).toBe("EX-SD-CAR-L"); // непознат цвят → 3 букви
  });

  it("nextPatternVersion винаги връща max+1 (без презаписване)", () => {
    expect(nextPatternVersion([])).toBe(1);
    expect(nextPatternVersion([1, 2, 3])).toBe(4);
    expect(nextPatternVersion([1, 3, 2])).toBe(4); // независимо от реда
    expect(nextPatternVersion([5])).toBe(6);
  });
});
