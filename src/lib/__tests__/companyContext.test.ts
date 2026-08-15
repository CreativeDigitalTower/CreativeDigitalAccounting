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
