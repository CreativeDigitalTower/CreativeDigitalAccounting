import { describe, it, expect } from "vitest";
import { resolveActorContext, wouldOrphanCompany } from "@/lib/company/context";

describe("resolveActorContext (actor vs target context)", () => {
  it("Test 1/2: нормален потребител → actor = context = self", () => {
    const r = resolveActorContext({ sessionUserId: "u1", isSuperAdmin: false, impersonatedCompanyId: null, targetOwnerUserId: null });
    expect(r).toEqual({ actorUserId: "u1", contextUserId: "u1", impersonating: false });
  });
  it("Super Admin без technical access → нормален контекст (self)", () => {
    const r = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: null, targetOwnerUserId: null });
    expect(r.impersonating).toBe(false);
    expect(r.contextUserId).toBe("sa");
  });
  it("Test 3/4: Super Admin technical access → context = target owner (SA не е context)", () => {
    const r = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: "C1", targetOwnerUserId: "client" });
    expect(r.actorUserId).toBe("sa");        // за audit
    expect(r.contextUserId).toBe("client");  // фирмите/собствеността са на клиента
    expect(r.impersonating).toBe(true);
  });
  it("Test 5: SA не става context дори при impersonation (owner се ползва, не SA)", () => {
    const r = resolveActorContext({ sessionUserId: "sa", isSuperAdmin: true, impersonatedCompanyId: "C1", targetOwnerUserId: "client" });
    expect(r.contextUserId).not.toBe("sa");
  });
  it("не-Super Admin не може да impersonate (context остава self)", () => {
    const r = resolveActorContext({ sessionUserId: "u1", isSuperAdmin: false, impersonatedCompanyId: "C1", targetOwnerUserId: "x" });
    expect(r.impersonating).toBe(false);
    expect(r.contextUserId).toBe("u1");
  });
});

describe("wouldOrphanCompany (Test 12: orphan защита)", () => {
  it("последен собственик → orphan (блокирай)", () => {
    expect(wouldOrphanCompany(["sa"], "sa")).toBe(true);
  });
  it("има друг собственик → не е orphan", () => {
    expect(wouldOrphanCompany(["sa", "client"], "sa")).toBe(false);
  });
  it("премахване на не-собственик не оставя orphan (собствениците остават)", () => {
    expect(wouldOrphanCompany(["client"], "sa")).toBe(false);
  });
});

describe("transfer flow — инварианти (ред: първо owner, после remove)", () => {
  // Моделира логиката на company-transfer: адд-овете стават ПРЕДИ проверката за orphan.
  function applyTransfer(ownersNow: string[], addOwners: string[], removeUserId: string | null): { ok: boolean; ownersAfter: string[]; error?: string } {
    const ownersAfterAdd = [...new Set([...ownersNow, ...addOwners])];
    if (removeUserId && ownersAfterAdd.includes(removeUserId) && wouldOrphanCompany(ownersAfterAdd, removeUserId)) {
      return { ok: false, ownersAfter: ownersAfterAdd, error: "ORPHAN" };
    }
    const ownersAfter = removeUserId ? ownersAfterAdd.filter((o) => o !== removeUserId) : ownersAfterAdd;
    return { ok: ownersAfter.length > 0, ownersAfter };
  }

  it("SEM случай: SA собственик → добавяме клиента, махаме SA → остава клиентът", () => {
    const r = applyTransfer(["sa"], ["client"], "sa");
    expect(r.ok).toBe(true);
    expect(r.ownersAfter).toEqual(["client"]); // Test: target owner създаден, SA махнат
  });
  it("не може remove без нов owner (само SA, махаме SA) → блок", () => {
    const r = applyTransfer(["sa"], [], "sa");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("ORPHAN");
  });
  it("upsert не създава дубликат membership (клиентът вече е owner)", () => {
    const r = applyTransfer(["client"], ["client"], "sa");
    expect(r.ownersAfter).toEqual(["client"]); // без дубликат
    expect(r.ok).toBe(true);
  });
  it("няколко нови собственика се добавят", () => {
    const r = applyTransfer(["sa"], ["c1", "c2"], "sa");
    expect(new Set(r.ownersAfter)).toEqual(new Set(["c1", "c2"]));
  });
});
