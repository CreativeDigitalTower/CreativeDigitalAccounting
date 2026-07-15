import { describe, it, expect } from "vitest";
import {
  normalizeEmail, isValidEmail, dedupeRecipients, prepareClientEmails, defaultRecipients,
} from "@/lib/clientEmails";

describe("normalizeEmail / isValidEmail", () => {
  it("normalizes case + whitespace", () => {
    expect(normalizeEmail("  Office@Firma.BG ")).toBe("office@firma.bg");
  });
  it("validates format", () => {
    expect(isValidEmail("a@b.bg")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
  it("allows shared inboxes like accounting@ / office@ / invoices@", () => {
    for (const e of ["accounting@firma.bg", "office@firma.bg", "invoices@firma.bg"]) {
      expect(isValidEmail(e)).toBe(true);
    }
  });
});

describe("dedupeRecipients (case-insensitive)", () => {
  it("removes duplicates preserving order", () => {
    expect(dedupeRecipients(["A@x.bg", "a@x.bg", "b@x.bg", " B@X.BG "])).toEqual(["a@x.bg", "b@x.bg"]);
  });
});

describe("prepareClientEmails", () => {
  it("test 1: single existing email → one primary", () => {
    const { emails, primaryEmail } = prepareClientEmails([{ email: "one@x.bg" }]);
    expect(emails).toHaveLength(1);
    expect(emails[0].isPrimary).toBe(true);
    expect(primaryEmail).toBe("one@x.bg");
  });

  it("test 2: adding second + third keeps exactly one primary", () => {
    const { emails, primaryEmail } = prepareClientEmails([
      { email: "one@x.bg", isPrimary: true },
      { email: "two@x.bg" },
      { email: "three@x.bg" },
    ]);
    expect(emails).toHaveLength(3);
    expect(emails.filter((e) => e.isPrimary)).toHaveLength(1);
    expect(primaryEmail).toBe("one@x.bg");
  });

  it("test 3: invalid email throws", () => {
    expect(() => prepareClientEmails([{ email: "broken" }])).toThrowError();
  });

  it("test 4: duplicate email (case-insensitive) throws", () => {
    expect(() => prepareClientEmails([{ email: "a@x.bg" }, { email: "A@X.BG" }])).toThrowError();
  });

  it("test 5: switching primary keeps a single primary", () => {
    const { primaryEmail } = prepareClientEmails([
      { email: "one@x.bg", isPrimary: false },
      { email: "two@x.bg", isPrimary: true },
    ]);
    expect(primaryEmail).toBe("two@x.bg");
  });

  it("promotes a primary when none is marked", () => {
    const { emails } = prepareClientEmails([{ email: "one@x.bg" }, { email: "two@x.bg" }]);
    expect(emails[0].isPrimary).toBe(true);
    expect(emails[1].isPrimary).toBe(false);
  });

  it("primary is forced active even if marked inactive", () => {
    const { emails } = prepareClientEmails([{ email: "one@x.bg", isPrimary: true, isActive: false }]);
    expect(emails[0].isActive).toBe(true);
  });

  it("empty input yields no primary", () => {
    expect(prepareClientEmails([])).toEqual({ emails: [], primaryEmail: null });
  });
});

describe("defaultRecipients (test 8: auto-selected recipients)", () => {
  const rows = prepareClientEmails([
    { email: "office@x.bg", isPrimary: true, receivesInvoices: false, receivesReminders: true },
    { email: "acc@x.bg", type: "accounting", receivesInvoices: true, receivesReminders: false },
    { email: "old@x.bg", isActive: false, receivesInvoices: true },
  ]).emails;

  it("invoice → only active addresses flagged receivesInvoices", () => {
    expect(defaultRecipients(rows, "invoice")).toEqual(["acc@x.bg"]);
  });
  it("reminder → addresses flagged receivesReminders", () => {
    expect(defaultRecipients(rows, "reminder")).toEqual(["office@x.bg"]);
  });
  it("falls back to primary when none flagged", () => {
    const r = prepareClientEmails([
      { email: "p@x.bg", isPrimary: true, receivesOffers: false },
      { email: "q@x.bg", receivesOffers: false },
    ]).emails;
    expect(defaultRecipients(r, "offer")).toEqual(["p@x.bg"]);
  });
  it("uses fallback contactEmail when no structured addresses", () => {
    expect(defaultRecipients([], "invoice", "Legacy@X.bg")).toEqual(["legacy@x.bg"]);
  });
});
