import { describe, it, expect } from "vitest";
import { auditAllTemplates, auditTemplateById } from "@/lib/businessDocs/audit";
import { buildDocumentHtml, getTemplate, TEMPLATES } from "@/lib/businessDocs/templates";
import { auditContext } from "@/lib/businessDocs/audit";

describe("Нормативен одит на всички шаблони", () => {
  const { findings, total, failing } = auditAllTemplates();

  it("библиотеката е богата (100+ шаблона)", () => {
    expect(total).toBeGreaterThan(100);
  });

  it("НИТО един шаблон не нарушава задължителните реквизити", () => {
    const bad = findings.filter((f) => !f.ok).map((f) => `${f.title}: ${f.missing.join(", ")}`);
    expect(bad).toEqual([]);
    expect(failing).toBe(0);
  });

  it("официалните документи носят издателски ЕИК", () => {
    const ctx = auditContext();
    const off = TEMPLATES.find((t) => t.categoryId === "letters")!;
    const html = buildDocumentHtml(off, ctx);
    expect(html).toContain(ctx.company.eik);
  });

  it("декларациите съдържат клауза по чл. 313 НК", () => {
    const decl = TEMPLATES.filter((t) => t.categoryId === "declarations");
    for (const t of decl) {
      const html = buildDocumentHtml(t, auditContext());
      expect(html.includes("313") || /наказателна отговорност/i.test(html)).toBe(true);
    }
  });

  it("нормализаторът е идемпотентен (не дублира ЕИК)", () => {
    const ctx = auditContext();
    const t = getTemplate("letters-1")!;
    const html = buildDocumentHtml(t, ctx);
    const occurrences = html.split(ctx.company.eik).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(1);
    // не се добавя издателски ред, ако ЕИК вече присъства (идемпотентност чрез повторно подаване)
    const twice = buildDocumentHtml({ ...t }, ctx);
    expect(twice.split(ctx.company.eik).length - 1).toBe(occurrences);
  });

  it("няма неразрешени плейсхолдъри в изхода", () => {
    for (const t of TEMPLATES) {
      const html = buildDocumentHtml(t, auditContext());
      expect(/\{\{[^}]+\}\}/.test(html)).toBe(false);
    }
  });

  it("auditTemplateById работи за конкретен шаблон", () => {
    const f = auditTemplateById(TEMPLATES[0].id);
    expect(f?.ok).toBe(true);
  });
});
