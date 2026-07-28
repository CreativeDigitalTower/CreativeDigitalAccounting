import { describe, it, expect } from "vitest";
import { canTrash, trashCaps } from "@/lib/permissions";

describe("canTrash — групирани права за Кошче по роля", () => {
  it("собственик има всички права", () => {
    for (const p of ["delete", "restore", "permanent"] as const) expect(canTrash("owner", p)).toBe(true);
  });
  it("мениджър/счетоводител: изтрива + възстановява, но НЕ окончателно", () => {
    for (const role of ["manager", "accountant"]) {
      expect(canTrash(role, "delete")).toBe(true);
      expect(canTrash(role, "restore")).toBe(true);
      expect(canTrash(role, "permanent")).toBe(false);
    }
  });
  it("продажби/склад: само изтриване", () => {
    for (const role of ["sales", "warehouse"]) {
      expect(canTrash(role, "delete")).toBe(true);
      expect(canTrash(role, "restore")).toBe(false);
      expect(canTrash(role, "permanent")).toBe(false);
    }
  });
  it("viewer/employee: никакви права", () => {
    for (const role of ["viewer", "employee"]) {
      expect(canTrash(role, "delete")).toBe(false);
      expect(canTrash(role, "restore")).toBe(false);
      expect(canTrash(role, "permanent")).toBe(false);
    }
  });
  it("липсваща роля → без права", () => {
    expect(canTrash(null, "delete")).toBe(false);
    expect(canTrash(undefined, "restore")).toBe(false);
    expect(canTrash("unknown", "permanent")).toBe(false);
  });
});

describe("trashCaps", () => {
  it("връща компактен набор", () => {
    expect(trashCaps("owner")).toEqual({ canDelete: true, canRestore: true, canPermanent: true });
    expect(trashCaps("sales")).toEqual({ canDelete: true, canRestore: false, canPermanent: false });
    expect(trashCaps("viewer")).toEqual({ canDelete: false, canRestore: false, canPermanent: false });
  });
});
