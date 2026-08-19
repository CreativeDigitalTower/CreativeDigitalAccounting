import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  REQUEST_TYPES, REQUEST_STATUSES, REQUEST_PRIORITIES, validateAttachment, sectorHintKey, notifiesClient,
  ALLOWED_ATTACHMENT_MIME, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES,
} from "@/lib/featureRequest/config";
import bg from "@/locales/bg/featureRequest.json";
import en from "@/locales/en/featureRequest.json";

describe("Feature request — конфигурация (§4, §8, §16)", () => {
  it("8 вида заявки + 9 статуса + 4 приоритета", () => {
    expect(REQUEST_TYPES).toHaveLength(8);
    expect(REQUEST_STATUSES).toHaveLength(9);
    expect(REQUEST_STATUSES).toContain("in_development");
    expect(REQUEST_PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("валидира прикачените файлове (§19)", () => {
    expect(validateAttachment("application/pdf", 1000)).toBe(null);
    expect(validateAttachment("image/png", 1000)).toBe(null);
    expect(validateAttachment("application/x-msdownload", 1000)).toBe("type");
    expect(validateAttachment("application/pdf", MAX_ATTACHMENT_BYTES + 1)).toBe("size");
    expect(ALLOWED_ATTACHMENT_MIME).toContain("image/jpeg");
    expect(MAX_ATTACHMENTS).toBe(3);
  });

  it("секторно-специфичен подсказ (§16)", () => {
    expect(sectorHintKey("production")).toBe("production");
    expect(sectorHintKey("restaurant")).toBe("restaurant");
    expect(sectorHintKey("trade")).toBe("trade");
    expect(sectorHintKey(null)).toBe("generic");
    expect(sectorHintKey("unknown_sector")).toBe("generic");
  });

  it("клиентът се известява при delivered (§20)", () => {
    expect(notifiesClient("delivered")).toBe(true);
    expect(notifiesClient("new")).toBe(false);
    expect(notifiesClient("reviewing")).toBe(false);
  });
});

describe("Feature request — i18n покритие (§25)", () => {
  it("bg и en имат еднакви ключове за типове и статуси", () => {
    expect(Object.keys((bg as { type: object }).type).sort()).toEqual(Object.keys((en as { type: object }).type).sort());
    expect(Object.keys((bg as { status: object }).status).sort()).toEqual(Object.keys((en as { status: object }).status).sort());
    for (const s of REQUEST_STATUSES) expect((bg as { status: Record<string, string> }).status[s]).toBeTruthy();
  });
});

// Статичен guard: всеки API route е зад auth guard; всяка мутация пише в AuditLog (§26, §27).
describe("Feature request — сигурност на маршрутите (§26, §27)", () => {
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) out.push(...walk(p));
      else if (n === "route.ts") out.push(p);
    }
    return out;
  }
  const routes = [...walk("src/app/api/feature-requests"), ...walk("src/app/api/admin/feature-requests")];

  it("има маршрути за клиент + админ", () => {
    expect(routes.length).toBeGreaterThanOrEqual(6);
  });

  it("всеки маршрут е зад requireCompany или requireSuperAdmin", () => {
    const bad = routes.filter((f) => !/require(Company|SuperAdmin)/.test(readFileSync(f, "utf8")));
    expect(bad, `Без auth guard:\n${bad.join("\n")}`).toEqual([]);
  });

  it("всяка мутация (POST/PATCH/DELETE) пише в AuditLog", () => {
    const bad = routes.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /export async function (POST|PATCH|DELETE)/.test(src) && !/\baudit\(/.test(src);
    });
    expect(bad, `Мутация без audit:\n${bad.join("\n")}`).toEqual([]);
  });
});
