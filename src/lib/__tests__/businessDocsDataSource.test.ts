import { describe, it, expect } from "vitest";
import { resolveVariables } from "@/lib/businessDocs/variables";
import { TEMPLATES, templateDataSource, getTemplate } from "@/lib/businessDocs/templates";

describe("templateDataSource — всеки шаблон знае източника си", () => {
  it("HR документите ползват Служител", () => {
    const hr = TEMPLATES.filter((t) => t.categoryId === "hr");
    expect(hr.length).toBeGreaterThan(0);
    for (const t of hr) expect(templateDataSource(t)).toBe("employee");
  });
  it("документите към доставчици ползват Доставчик", () => {
    const sup = TEMPLATES.filter((t) => t.categoryId === "suppliers");
    for (const t of sup) expect(templateDataSource(t)).toBe("supplier");
  });
  it("клиентските/протоколните ползват Клиент", () => {
    for (const cat of ["clients", "protocols", "acceptance", "construction"]) {
      const list = TEMPLATES.filter((t) => t.categoryId === cat);
      for (const t of list) expect(templateDataSource(t)).toBe("client");
    }
  });
  it("чисто фирмени категории → none (само фирмени данни)", () => {
    const decl = TEMPLATES.filter((t) => t.categoryId === "declarations");
    for (const t of decl) expect(templateDataSource(t)).toBe("none");
  });
  it("трудовият договор е employee, а не client", () => {
    const trud = TEMPLATES.find((t) => t.categoryId === "hr" && t.title === "Трудов договор");
    expect(trud).toBeTruthy();
    expect(templateDataSource(trud!)).toBe("employee");
  });
});

describe("resolveVariables — Служител (HR авто-попълване)", () => {
  const vars = resolveVariables({
    company: { name: "Фирма ООД", eik: "123" },
    employee: { name: "Иван Петров", position: "Мениджър", department: "Продажби", phone: "0888", email: "i@x.bg", salary: 2500, hiredAt: new Date("2024-03-01"), iban: "BG80..." },
    docNumber: "HR-2026-0001",
  });
  it("попълва име/длъжност/отдел/телефон/email", () => {
    expect(vars["Служител.Име"]).toBe("Иван Петров");
    expect(vars["Служител.Длъжност"]).toBe("Мениджър");
    expect(vars["Служител.Отдел"]).toBe("Продажби");
    expect(vars["Служител.Телефон"]).toBe("0888");
    expect(vars["Служител.Email"]).toBe("i@x.bg");
  });
  it("форматира възнаграждение и дата на назначаване", () => {
    expect(vars["Служител.Възнаграждение"]).toContain("2");
    expect(vars["Служител.ДатаНазначаване"]).not.toBe("");
  });
  it("ЕГН/лична карта/работно време остават празни (не се пазят)", () => {
    expect(vars["Служител.ЕГН"]).toBeUndefined();
  });
});

describe("resolveVariables — Доставчик", () => {
  it("попълва данните на доставчика", () => {
    const vars = resolveVariables({ supplier: { name: "Доставчик АД", eik: "999", vatNumber: "BG999", contactPerson: "Петър" } });
    expect(vars["Доставчик.Име"]).toBe("Доставчик АД");
    expect(vars["Доставчик.ЕИК"]).toBe("999");
    expect(vars["Доставчик.ДДС"]).toBe("BG999");
    expect(vars["Доставчик.МОЛ"]).toBe("Петър");
  });
});

describe("обратна съвместимост — клиентските променливи still resolve", () => {
  it("Клиент.* работят както преди", () => {
    const vars = resolveVariables({ client: { name: "Клиент ЕООД", eik: "111" } });
    expect(vars["Клиент.Име"]).toBe("Клиент ЕООД");
    expect(vars["Клиент.ЕИК"]).toBe("111");
  });
  it("getTemplate връща валиден шаблон с dataSource", () => {
    const first = TEMPLATES[0];
    expect(getTemplate(first.id)?.dataSource).toBeTruthy();
  });
});
