import { describe, it, expect } from "vitest";
import { buildMonthMatrix, mondayIndex, WEEKDAY_KEYS, WEEK_STARTS_ON } from "@/lib/date/week";

describe("calendar week — Monday first (18/22/25)", () => {
  it("weekday order starts Monday, ends Sunday", () => {
    expect(WEEKDAY_KEYS).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(WEEK_STARTS_ON).toBe(1);
  });
  it("mondayIndex: Monday=0 ... Sunday=6", () => {
    expect(mondayIndex(new Date("2026-08-31"))).toBe(0); // Monday
    expect(mondayIndex(new Date("2026-08-30"))).toBe(6); // Sunday
    expect(mondayIndex(new Date("2026-08-29"))).toBe(5); // Saturday
  });
  it("month matrix first column is always Monday", () => {
    const weeks = buildMonthMatrix(2026, 7); // August 2026
    for (const week of weeks) {
      expect(mondayIndex(new Date(week[0].iso + "T00:00:00"))).toBe(0);
      expect(mondayIndex(new Date(week[6].iso + "T00:00:00"))).toBe(6);
    }
  });
  it("first week contains the 1st of the month", () => {
    const weeks = buildMonthMatrix(2026, 0); // Jan 2026
    const firstWeekDays = weeks[0].map((c) => c.iso);
    expect(firstWeekDays).toContain("2026-01-01");
  });
  it("all in-month days are present exactly once", () => {
    const weeks = buildMonthMatrix(2026, 1); // Feb 2026 (28 days)
    const inMonth = weeks.flat().filter((c) => c.inMonth).map((c) => c.day);
    expect(inMonth.length).toBe(28);
    expect(new Set(inMonth).size).toBe(28);
  });
});
