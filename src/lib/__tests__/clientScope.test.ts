import { describe, it, expect } from "vitest";
import { isLinkedBuyer, clientCompanyAllowed } from "@/lib/logistics/clientScope";

const BG = "metal-trade";
const SEM = "sem-international";
const OTHER = "unrelated-co";

describe("client scope — cross-company (2/3/11)", () => {
  it("linked buyer must be a group counterparty", () => {
    expect(isLinkedBuyer(SEM, [SEM])).toBe(true);
    expect(isLinkedBuyer(OTHER, [SEM])).toBe(false); // unrelated company excluded
    expect(isLinkedBuyer(null, [SEM])).toBe(false);
  });
  it("SEM client is allowed when SEM is the buyer", () => {
    expect(clientCompanyAllowed(SEM, { activeCompanyId: BG, buyerCompanyId: SEM })).toBe(true);
  });
  it("active-company (legacy BG) client still allowed", () => {
    expect(clientCompanyAllowed(BG, { activeCompanyId: BG, buyerCompanyId: SEM })).toBe(true);
  });
  it("unrelated company client is rejected", () => {
    expect(clientCompanyAllowed(OTHER, { activeCompanyId: BG, buyerCompanyId: SEM })).toBe(false);
  });
  it("without a buyer, only active-company clients pass", () => {
    expect(clientCompanyAllowed(SEM, { activeCompanyId: BG })).toBe(false);
    expect(clientCompanyAllowed(BG, { activeCompanyId: BG })).toBe(true);
  });
  it("on edit, a client of any group counterparty is allowed", () => {
    expect(clientCompanyAllowed(SEM, { activeCompanyId: BG, groupCounterpartyIds: [SEM] })).toBe(true);
    expect(clientCompanyAllowed(OTHER, { activeCompanyId: BG, groupCounterpartyIds: [SEM] })).toBe(false);
  });
});
