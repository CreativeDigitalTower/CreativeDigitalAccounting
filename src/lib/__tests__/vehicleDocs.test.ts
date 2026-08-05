import { describe, it, expect } from "vitest";
import { resolveVariables } from "@/lib/businessDocs/variables";
import { TEMPLATES, getTemplate, getCategory, buildDocumentHtml, templateDataSource } from "@/lib/businessDocs/templates";

describe("Автомобили и гориво — категория", () => {
  const veh = TEMPLATES.filter((t) => t.categoryId === "vehicles");

  it("категорията съществува с професионални образци", () => {
    expect(getCategory("vehicles")?.title).toContain("Автомобили");
    expect(veh.length).toBeGreaterThanOrEqual(6);
  });

  it("включва пътни листове и отчет за гориво", () => {
    const titles = veh.map((t) => t.title);
    expect(titles.some((t) => t.includes("Пътен лист"))).toBe(true);
    expect(titles.some((t) => t.includes("Отчет за разход на гориво"))).toBe(true);
    expect(titles.some((t) => t.includes("разходни норми"))).toBe(true);
  });

  it("източникът на данни е vehicle", () => {
    for (const t of veh) expect(templateDataSource(t)).toBe("vehicle");
  });

  it("пътният лист попълва фирма + автомобил и има задължителните реквизити", () => {
    const t = veh.find((x) => x.title === "Пътен лист (лек автомобил)")!;
    const html = buildDocumentHtml(getTemplate(t.id)!, {
      company: { name: "Транс ЕООД", eik: "123456789", city: "София" },
      vehicle: { registration: "СА1234ВС", brand: "VW", model: "Passat", fuelType: "дизел", fuelNorm: 6.5 },
      docNumber: "VEHICLES-2026-0001", docDate: new Date("2026-01-10"),
    });
    expect(html).toContain("Транс ЕООД");
    expect(html).toContain("СА1234ВС");
    expect(html).toContain("VW");
    expect(html).toContain("6.5"); // разходна норма
    // задължителни реквизити на пътния лист:
    expect(html).toContain("Начален км");
    expect(html).toContain("Краен км");
    expect(html).toContain("Изминати км");
    expect(html).toContain("Остатък в резервоара");
  });
});

describe("resolveVariables — Автомобил", () => {
  it("попълва данните на автомобила", () => {
    const vars = resolveVariables({ vehicle: { registration: "PB9999AB", brand: "Ford", fuelNorm: 8 } });
    expect(vars["Автомобил.Регистрация"]).toBe("PB9999AB");
    expect(vars["Автомобил.Марка"]).toBe("Ford");
    expect(vars["Автомобил.РазходнаНорма"]).toBe("8");
  });
});
