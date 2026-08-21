import { describe, it, expect } from "vitest";
import { buildDocumentData, dispatchTotalQuantity, type ExportSetSource, type Parties } from "@/lib/logistics/exportDocs";

const src: ExportSetSource = {
  invoiceNumber: "0000009617", invoiceDate: "2026-08-15T00:00:00.000Z",
  destination: "Скопје", truckRegSnapshot: "SK3832BO", trailerReg: "SK7430BI",
  productSnapshot: "цемент CEM II A-LL 42.5 R, HOLCIM - рефуз",
  quantity: 23.8, unit: "ТОН", declarationCmrDate: null, dispatchNumber: "9617",
};
const parties: Parties = {
  seller: { name: "БГ ЕООД" },
  buyer: { name: '"Сем Интернационал" ДООЕЛ', address: 'ул. "Маршал Тито" бр.55', city: "Тетово" },
  client: { name: "ХОЛ-ТРЕЈД ДООЕЛ", address: "Скопје" },
};

describe("Испратница — автоматично попълване (§16)", () => {
  const data = buildDocumentData(src, parties, "dispatch") as Record<string, any>;

  it("issuer = МК фирмата (Сем Интернационал), с адрес и град", () => {
    expect(data.issuer.name).toBe('"Сем Интернационал" ДООЕЛ');
    expect(data.issuer.address).toBe('ул. "Маршал Тито" бр.55');
    expect(data.issuer.city).toBe("Тетово");
  });
  it("recipient (До) = клиентът", () => {
    expect(data.recipient.name).toBe("ХОЛ-ТРЕЈД ДООЕЛ");
  });
  it("номер и дата се попълват (без #REF!)", () => {
    expect(data.dispatchNumber).toBe("9617");
    expect(data.date).toBe("2026-08-15T00:00:00.000Z");
    expect(JSON.stringify(data)).not.toContain("#REF!");
  });
  it("ред: камион, материал, мярка, количество; стойност по фактура", () => {
    const r = data.rows[0];
    expect(r.truck).toBe("SK3832BO / SK7430BI");
    expect(r.material).toBe("цемент CEM II A-LL 42.5 R, HOLCIM - рефуз");
    expect(r.unit).toBe("ТОН");
    expect(r.quantity).toBe(23.8);
    expect(r.valueMkd).toBe("по фактура");
  });
  it("ВКУПНО (totalQuantity) = количеството", () => {
    expect(data.totalQuantity).toBe(23.8);
  });
});

describe("Испратница — blank копие", () => {
  it("blank → без получател (До празно)", () => {
    const data = buildDocumentData(src, parties, "blank") as Record<string, any>;
    expect(data.recipient).toBeNull();
  });
});

describe("dispatchTotalQuantity", () => {
  it("сумира количествата на редовете", () => {
    expect(dispatchTotalQuantity([{ quantity: 23.8 }, { quantity: 4.2 }, { quantity: null }])).toBe(28);
  });
  it("празни редове → 0", () => {
    expect(dispatchTotalQuantity([{}, { quantity: null }])).toBe(0);
  });
});

import { displayUnit } from "@/lib/logistics/exportDocs";
import { resolveDispatchIssuer } from "@/lib/logistics/dispatchIssuer";

describe("displayUnit -> ТОН в Испратницата (§1)", () => {
  it("t / T / ton / tons / tne → ТОН", () => {
    for (const u of ["t", "T", "ton", "Tone", "TONNE", "tons", "tne", "тон", "Тона"]) {
      expect(displayUnit(u)).toBe("ТОН");
    }
  });
  it("празно остава празно; други единици → uppercase", () => {
    expect(displayUnit("")).toBe("");
    expect(displayUnit(null)).toBe("");
    expect(displayUnit("kg")).toBe("KG");
  });
});

describe("resolveDispatchIssuer - кирилски хедър (§3)", () => {
  const NATIVE = { name: '"Сем Интернационал" ДООЕЛ', address: 'ул. "Маршал Тито" бр.55', city: "Тетово" };
  it("маппва английския/изкривен вариант към точния кирилски текст", () => {
    expect(resolveDispatchIssuer({ name: "SEM INERNAIONAL JOUEL", address: "55 Marshal Tito Str.", city: "Tetovo. North Macedonia" }))
      .toEqual(NATIVE);
  });
  it("маппва и коректния латински/кирилски вариант", () => {
    expect(resolveDispatchIssuer({ name: "Sem Internacional DOOEL" })).toMatchObject(NATIVE);
    expect(resolveDispatchIssuer({ name: '"Сем Интернационал" ДООЕЛ' })).toMatchObject(NATIVE);
  });
  it("непознат издател остава непроменен (без глобални промени)", () => {
    const other = { name: "Друга Фирма ЕООД", address: "ул. Х", city: "София" };
    expect(resolveDispatchIssuer(other)).toEqual(other);
  });
  it("null → празно име", () => {
    expect(resolveDispatchIssuer(null)).toEqual({ name: null });
  });
});
