import { describe, it, expect } from "vitest";
import { z } from "zod";
import { requireField, zodFieldErrors, VMSG, type FieldErrors } from "@/lib/logistics/validation";
import { exceedsPayload } from "@/lib/logistics/fleet";

describe("requireField", () => {
  it("flags empty string / null / undefined", () => {
    const e: FieldErrors = {};
    expect(requireField(e, "clientId", "", VMSG.client)).toBe(false);
    expect(requireField(e, "productId", null, VMSG.product)).toBe(false);
    expect(requireField(e, "quantity", undefined, VMSG.quantity)).toBe(false);
    expect(e).toEqual({ clientId: VMSG.client, productId: VMSG.product, quantity: VMSG.quantity });
  });
  it("passes non-empty values", () => {
    const e: FieldErrors = {};
    expect(requireField(e, "clientId", "abc", VMSG.client)).toBe(true);
    expect(e).toEqual({});
  });
});

describe("zodFieldErrors — validation details per field", () => {
  const schema = z.object({
    vehicleId: z.string().min(1, VMSG.vehicle),
    productId: z.string().min(1, VMSG.product),
    dispatchDate: z.string().min(1, VMSG.date),
  });
  it("maps a single missing field", () => {
    const r = schema.safeParse({ vehicleId: "", productId: "p", dispatchDate: "2026-01-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)).toEqual({ vehicleId: VMSG.vehicle });
  });
  it("maps multiple missing fields", () => {
    const r = schema.safeParse({ vehicleId: "", productId: "", dispatchDate: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(zodFieldErrors(r.error)).toEqual({ vehicleId: VMSG.vehicle, productId: VMSG.product, dispatchDate: VMSG.date });
  });
});

describe("payload validation message (§14)", () => {
  it("exceedsPayload drives the warning", () => {
    expect(exceedsPayload(30, 28)).toBe(true);
    expect(exceedsPayload(28, 28)).toBe(false);
  });
  it("payload message embeds the max as 3-decimal tons", () => {
    expect(VMSG.payload("28,000")).toBe("Количеството надвишава максималния товар на автомобила – 28,000 t.");
  });
});
