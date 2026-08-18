import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FASHION_PERMISSIONS, fashionCaps, canFashion } from "@/lib/fashion/perms";

// ── Статичен guard: всеки API route на модула трябва да е зад fashionApiGuard, а
// всяка мутация (POST/PATCH/PUT/DELETE) — да пише в AuditLog (§31, §34, §37). ──
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

describe("Fashion — сигурност на API маршрутите (§31, §34)", () => {
  const routes = walk("src/app/api/fashion");

  it("има поне толкова маршрути, колкото са фазите", () => {
    expect(routes.length).toBeGreaterThanOrEqual(20);
  });

  it("всеки маршрут е зад fashionApiGuard с конкретно право", () => {
    const bad: string[] = [];
    for (const f of routes) {
      const src = readFileSync(f, "utf8");
      if (!/fashionApiGuard\(\s*["'][a-z_]+["']\s*\)/.test(src)) bad.push(f);
    }
    expect(bad, `Без permission guard:\n${bad.join("\n")}`).toEqual([]);
  });

  it("всяка мутация (POST/PATCH/PUT/DELETE) пише в AuditLog", () => {
    const bad: string[] = [];
    for (const f of routes) {
      const src = readFileSync(f, "utf8");
      if (/export async function (POST|PATCH|PUT|DELETE)/.test(src) && !/\baudit\(/.test(src)) bad.push(f);
    }
    expect(bad, `Мутация без audit:\n${bad.join("\n")}`).toEqual([]);
  });
});

describe("Fashion — пълно покритие на правата (§34)", () => {
  it("15 права, каналите за costing/margin са отделни", () => {
    expect(FASHION_PERMISSIONS).toHaveLength(15);
    expect(FASHION_PERMISSIONS).toContain("view_costing");
    expect(FASHION_PERMISSIONS).toContain("manage_costing");
  });

  it("owner има всички; employee няма нито едно", () => {
    for (const p of FASHION_PERMISSIONS) {
      expect(canFashion("owner", p)).toBe(true);
      expect(canFashion("employee", p)).toBe(false);
    }
  });

  it("fashionCaps връща пълна булева матрица за всяка роля", () => {
    for (const role of ["owner", "manager", "accountant", "warehouse", "sales", "viewer"]) {
      const caps = fashionCaps(role);
      expect(Object.keys(caps).sort()).toEqual([...FASHION_PERMISSIONS].sort());
    }
  });

  it("цехов оператор (warehouse) не вижда себестойност/цени", () => {
    expect(canFashion("warehouse", "view_costing")).toBe(false);
    expect(canFashion("warehouse", "manage_costing")).toBe(false);
  });
});
