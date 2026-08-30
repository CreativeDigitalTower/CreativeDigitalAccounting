import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const LANGS = ["bg", "en", "ru", "ro", "tr", "el"] as const;
const load = (l: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), `src/locales/${l}/logistics.json`), "utf-8"));
const resolve = (tree: any, dotted: string): string | null => {
  let cur: any = tree;
  for (const p of dotted.split(".")) { if (cur && typeof cur === "object" && p in cur) cur = cur[p]; else return null; }
  return typeof cur === "string" ? cur : null;
};

// Ключове, реално използвани във VehicleDossier (§10/§11).
const DOSSIER_KEYS = ["basic", "documents", "docType", "docName", "docNumber", "validTo", "noDocs", "history", "historyPlaceholder", "deliveries", "noDeliveries", "addDoc", "download", "file"];
const VEHICLE_DOC_TYPES = ["registration", "insurance", "inspection", "license", "permit", "contract", "certificate", "other"];

describe("Vehicle Dossier i18n — BG texts (1/2)", () => {
  const bg = load("bg");
  it("resolves the required dossier labels to exact Bulgarian text", () => {
    expect(resolve(bg, "dossier.basic")).toBe("Основни данни");
    expect(resolve(bg, "dossier.documents")).toBe("Документи на автомобила");
    expect(resolve(bg, "dossier.docType")).toBe("Вид документ");
    expect(resolve(bg, "dossier.docName")).toBe("Наименование");
    expect(resolve(bg, "dossier.validTo")).toBe("Валиден до");
    expect(resolve(bg, "dossier.noDocs")).toBe("Няма добавени документи към автомобила.");
    expect(resolve(bg, "dossier.history")).toBe("История");
    expect(resolve(bg, "dossier.historyPlaceholder")).toBe("Все още няма записана история за този автомобил.");
  });
  it("resolves every real vehicle docType value (no raw keys, no abbreviations)", () => {
    for (const dt of VEHICLE_DOC_TYPES) {
      const v = resolve(bg, `docTypes.${dt}`);
      expect(v, `docTypes.${dt}`).toBeTruthy();
      expect(v!.startsWith("logistics.")).toBe(false);
      expect(v!.length).toBeGreaterThan(2);
    }
    expect(resolve(bg, "docTypes.registration")).toBe("Регистрационен документ");
    expect(resolve(bg, "docTypes.inspection")).toBe("Технически преглед");
  });
});

describe("Vehicle Dossier i18n — parity across all 6 languages (12)", () => {
  it("every dossier + docType key resolves in every language", () => {
    for (const l of LANGS) {
      const tree = load(l);
      for (const k of DOSSIER_KEYS) expect(resolve(tree, `dossier.${k}`), `${l} dossier.${k}`).toBeTruthy();
      for (const dt of VEHICLE_DOC_TYPES) expect(resolve(tree, `docTypes.${dt}`), `${l} docTypes.${dt}`).toBeTruthy();
    }
  });
  it("no resolved value is a raw i18n key", () => {
    for (const l of LANGS) {
      const tree = load(l);
      for (const k of DOSSIER_KEYS) expect(resolve(tree, `dossier.${k}`)!.startsWith("logistics.")).toBe(false);
      for (const dt of VEHICLE_DOC_TYPES) expect(resolve(tree, `docTypes.${dt}`)!.startsWith("logistics.")).toBe(false);
    }
  });
  it("does not overwrite the existing shipment docTypes keys", () => {
    // регресионна проверка: старите ключове остават (не сме ги изтрили при merge).
    const bg = load("bg");
    for (const k of ["cmr", "customs_declaration", "waybill", "proforma"]) expect(resolve(bg, `docTypes.${k}`)).toBeTruthy();
  });
});
