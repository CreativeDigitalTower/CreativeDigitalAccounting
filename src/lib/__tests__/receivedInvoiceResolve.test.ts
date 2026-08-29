import { describe, it, expect } from "vitest";
import { resolveReceivedInvoice } from "@/lib/logistics/received";

describe("resolveReceivedInvoice — Document is source of truth (17/23)", () => {
  it("prefers standard Document when present", () => {
    expect(resolveReceivedInvoice({ id: "d1", number: "F-1" }, { id: "m1", number: "MK-1", documentId: null }))
      .toEqual({ id: "d1", number: "F-1", kind: "document" });
  });
  it("falls back to legacy MkInvoice when no Document and not bridged", () => {
    expect(resolveReceivedInvoice(null, { id: "m1", number: "MK-1", documentId: null }))
      .toEqual({ id: "m1", number: "MK-1", kind: "mk" });
  });
  it("hides a bridged legacy MkInvoice (documentId set) to avoid double display", () => {
    expect(resolveReceivedInvoice(null, { id: "m1", number: "MK-1", documentId: "d9" })).toBeNull();
  });
  it("returns null when nothing is linked (uninvoiced)", () => {
    expect(resolveReceivedInvoice(null, null)).toBeNull();
  });
});
