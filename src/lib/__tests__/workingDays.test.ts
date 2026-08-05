import { describe, it, expect } from "vitest";
import { calculateWorkingDays, calculateLeaveDays, countModeFor, DEFAULT_SCHEDULE } from "@/lib/workingDays";
import { bgHolidaysForYear, bgHolidayName } from "@/lib/holidays";

const wd = (a: string, b: string, opts = {}) => calculateWorkingDays(a, b, opts).workingDays;

describe("calculateWorkingDays — базови случаи", () => {
  it("понеделник–петък → 5 работни дни", () => {
    // 2026-08-10 (пн) .. 2026-08-14 (пт)
    expect(wd("2026-08-10", "2026-08-14")).toBe(5);
  });
  it("период, включващ събота и неделя, ги изключва", () => {
    const b = calculateWorkingDays("2026-08-07", "2026-08-14");
    expect(b.calendarDays).toBe(8);
    expect(b.weekendDays).toBe(2);
  });
  it("само събота и неделя → 0 работни дни", () => {
    expect(wd("2026-08-08", "2026-08-09")).toBe(0);
  });
  it("еднакви дати — работен ден → 1", () => {
    expect(wd("2026-08-10", "2026-08-10")).toBe(1);
  });
  it("еднакви дати — неработен ден (събота) → 0", () => {
    expect(wd("2026-08-08", "2026-08-08")).toBe(0);
  });
  it("крайна преди начална → невалидно", () => {
    const b = calculateWorkingDays("2026-08-14", "2026-08-07");
    expect(b.valid).toBe(false);
    expect(b.error).toBe("end_before_start");
  });
});

describe("REGRESSION: сигнализираният период 07.08.2026–14.08.2026", () => {
  it("са точно 6 работни дни (петък + пн–пт), 8 календарни, 2 уикенд", () => {
    const b = calculateWorkingDays("2026-08-07", "2026-08-14");
    expect(b.valid).toBe(true);
    expect(b.calendarDays).toBe(8);
    expect(b.weekendDays).toBe(2);
    expect(b.holidayDays).toBe(0);
    expect(b.workingDays).toBe(6); // НЕ 8
  });
});

describe("Официални празници (България)", () => {
  it("период с официален празник изключва празника", () => {
    // 24 май 2026 е неделя → компенсиращ почивен в понеделник 25.05. Ползваме 03.03.
    // 2026-03-03 (Освобождение) е вторник → трябва да се изключи.
    const b = calculateWorkingDays("2026-03-02", "2026-03-06"); // пн..пт
    expect(b.holidayDays).toBe(1);
    expect(b.workingDays).toBe(4); // 5 делнични − 1 празник
  });
  it("празник през уикенд не се брои двойно, но добавя компенсиращ ден", () => {
    // 2027: проверяваме, че компенсиращите дни съществуват за празници в събота/неделя
    const h = bgHolidaysForYear(2026);
    // 24 май 2026 е неделя → 25 май (пн) е компенсиращ
    expect(h.has("2026-05-25")).toBe(true);
  });
  it("великденските дни са включени (подвижни)", () => {
    // Православен Великден 2026 = 12 април (неделя). Разпети петък 10.04, Велики понеделник 13.04.
    const h = bgHolidaysForYear(2026);
    expect(h.has("2026-04-10")).toBe(true); // Разпети петък
    expect(h.has("2026-04-13")).toBe(true); // Велики понеделник
    expect(bgHolidayName("2026-04-13")).toContain("понеделник");
  });
});

describe("Индивидуален график", () => {
  it("шестдневна седмица (пн–сб) брои и съботите", () => {
    const b = calculateWorkingDays("2026-08-10", "2026-08-15", { schedule: { workingWeekdays: [1, 2, 3, 4, 5, 6] } });
    expect(b.workingDays).toBe(6); // пн–сб
  });
  it("нестандартни почивни дни (напр. почива понеделник)", () => {
    const b = calculateWorkingDays("2026-08-10", "2026-08-14", { schedule: { workingWeekdays: [2, 3, 4, 5, 6] } });
    // пн е почивен → 4 работни (вт–пт)
    expect(b.workingDays).toBe(4);
  });
  it("индивидуални неработни дни (extraOffDays)", () => {
    const b = calculateWorkingDays("2026-08-10", "2026-08-14", { extraOffDays: ["2026-08-12"] });
    expect(b.offDays).toBe(1);
    expect(b.workingDays).toBe(4);
  });
});

describe("Видове отсъствия / countMode", () => {
  it("платеният отпуск се брои в работни дни", () => {
    expect(countModeFor("leave")).toBe("WORKING_DAYS");
    expect(calculateLeaveDays("leave", "2026-08-07", "2026-08-14").workingDays).toBe(6);
  });
  it("болничен/неплатен също по работни дни (за графика)", () => {
    expect(countModeFor("sick")).toBe("WORKING_DAYS");
    expect(countModeFor("unpaid")).toBe("WORKING_DAYS");
  });
});

describe("Date-only без timezone изместване", () => {
  it("не измества с ±1 ден при полунощ", () => {
    // Дати в различни формати дават същия резултат.
    expect(wd("2026-08-10", "2026-08-14")).toBe(5);
    const b = calculateWorkingDays(new Date("2026-08-10T00:00:00Z"), new Date("2026-08-14T00:00:00Z"));
    expect(b.workingDays).toBe(5);
  });
  it("DEFAULT_SCHEDULE е петдневна", () => {
    expect(DEFAULT_SCHEDULE.workingWeekdays).toEqual([1, 2, 3, 4, 5]);
  });
});
