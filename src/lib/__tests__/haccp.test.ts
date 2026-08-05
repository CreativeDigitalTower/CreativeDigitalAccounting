import { describe, it, expect } from "vitest";
import { TEMPLATES, getCategory, getTemplate, buildDocumentHtml, templateDataSource } from "@/lib/businessDocs/templates";

describe("HACCP категория", () => {
  const haccp = TEMPLATES.filter((t) => t.categoryId === "haccp");

  it("категорията съществува и има богат набор документи", () => {
    expect(getCategory("haccp")).toBeTruthy();
    expect(haccp.length).toBeGreaterThanOrEqual(15);
  });

  it("включва ключовите дневници/регистри", () => {
    const titles = haccp.map((t) => t.title);
    for (const key of ["Температурен", "прием на суровини", "проследимост", "почистване", "лична хигиена", "обучение", "вредители", "критичните контролни точки"]) {
      expect(titles.some((t) => t.includes(key))).toBe(true);
    }
  });

  it("HACCP шаблоните са с източник none (фирмени данни авто, записи ръчно)", () => {
    for (const t of haccp) expect(templateDataSource(t)).toBe("none");
  });

  it("генерира печатна таблица с фирмени данни и колони", () => {
    const t = haccp.find((x) => x.title.includes("хладилници"))!;
    const html = buildDocumentHtml(getTemplate(t.id)!, {
      company: { name: "Пекарна ООД", eik: "123456789" },
      docNumber: "HACCP-2026-0001", docDate: new Date("2026-01-15"),
    });
    expect(html).toContain("Пекарна ООД");
    expect(html).toContain("123456789");
    expect(html).toContain("<table");
    expect(html).toContain("t°C"); // колона за температура
    expect(html).toContain("HACCP-2026-0001");
  });

  it("не чупи съществуващите категории (общият брой шаблони расте)", () => {
    expect(TEMPLATES.length).toBeGreaterThan(haccp.length);
  });
});
