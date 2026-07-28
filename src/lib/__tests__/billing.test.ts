import { describe, it, expect } from "vitest";
import {
  billingMode,
  isCdtClient,
  isRevenueExcluded,
  isPayingSubscriber,
  isAwaitingPayment,
  isCdtExpired,
} from "@/lib/billing";

// Помощни фабрики за абонаменти в трите независими измерения:
// функционален план · billing mode · payment status.
const paidActive = (plan = "pro") => ({ plan, billingMode: "standard", status: "active", paymentStatus: "received" });
const paidPending = (plan = "pro") => ({ plan, billingMode: "standard", status: "active", paymentStatus: "pending" });
const freeSub = () => ({ plan: "free", billingMode: "standard", status: "active", paymentStatus: "pending" });
const cdt = (plan = "business") => ({ plan, billingMode: "cdt_client", status: "active", paymentStatus: "received" });
const internal = (plan = "pro") => ({ plan, billingMode: "internal", status: "active", paymentStatus: "received" });

describe("billingMode() нормализация", () => {
  it("непознати/липсващи стойности → standard", () => {
    expect(billingMode(null)).toBe("standard");
    expect(billingMode(undefined)).toBe("standard");
    expect(billingMode({ billingMode: "" })).toBe("standard");
    expect(billingMode({ billingMode: "wtf" })).toBe("standard");
  });
  it("разпознава cdt_client и internal", () => {
    expect(billingMode({ billingMode: "cdt_client" })).toBe("cdt_client");
    expect(billingMode({ billingMode: "internal" })).toBe("internal");
  });
});

describe("isCdtClient()", () => {
  it("вярно само за cdt_client", () => {
    expect(isCdtClient(cdt())).toBe(true);
    expect(isCdtClient(internal())).toBe(false);
    expect(isCdtClient(paidActive())).toBe(false);
    expect(isCdtClient(null)).toBe(false);
  });
});

describe("isRevenueExcluded()", () => {
  it("CDT и вътрешни са изключени от приходите", () => {
    expect(isRevenueExcluded(cdt())).toBe(true);
    expect(isRevenueExcluded(internal())).toBe(true);
  });
  it("стандартните (платени/безплатни) НЕ са изключени", () => {
    expect(isRevenueExcluded(paidActive())).toBe(false);
    expect(isRevenueExcluded(freeSub())).toBe(false);
    expect(isRevenueExcluded(null)).toBe(false);
  });
});

describe("isPayingSubscriber() — влиза в MRR/ARR/платени", () => {
  it("платен + активен + потвърден + стандартен = плащащ", () => {
    expect(isPayingSubscriber(paidActive("start"))).toBe(true);
    expect(isPayingSubscriber(paidActive("business"))).toBe(true);
    expect(isPayingSubscriber(paidActive("pro"))).toBe(true);
  });
  it("CDT клиент (дори с Про/Бизнес план) НЕ е плащащ", () => {
    expect(isPayingSubscriber(cdt("pro"))).toBe(false);
    expect(isPayingSubscriber(cdt("business"))).toBe(false);
  });
  it("вътрешна фирма НЕ е плащащ", () => {
    expect(isPayingSubscriber(internal())).toBe(false);
  });
  it("собственият акаунт НЕ е плащащ", () => {
    expect(isPayingSubscriber(paidActive(), { isOwnAccount: true })).toBe(false);
  });
  it("безплатен или непотвърден НЕ е плащащ", () => {
    expect(isPayingSubscriber(freeSub())).toBe(false);
    expect(isPayingSubscriber(paidPending())).toBe(false);
  });
});

describe("isAwaitingPayment() — блок Очаква потвърждение", () => {
  it("платен план без потвърдено плащане = чака", () => {
    expect(isAwaitingPayment(paidPending())).toBe(true);
  });
  it("CDT/вътрешни НЕ чакат плащане", () => {
    expect(isAwaitingPayment(cdt())).toBe(false);
    expect(isAwaitingPayment(internal("pro"))).toBe(false);
  });
  it("потвърденият платен НЕ чака; собственият акаунт НЕ чака", () => {
    expect(isAwaitingPayment(paidActive())).toBe(false);
    expect(isAwaitingPayment(paidPending(), { isOwnAccount: true })).toBe(false);
  });
});

describe("isCdtExpired() — крайна дата = Изисква преглед", () => {
  const past = new Date("2020-01-01");
  const future = new Date("2999-01-01");
  it("CDT с минала крайна дата = изтекъл", () => {
    expect(isCdtExpired({ billingMode: "cdt_client", cdtEndsAt: past })).toBe(true);
  });
  it("CDT без дата (безсрочен) НЕ е изтекъл", () => {
    expect(isCdtExpired({ billingMode: "cdt_client", cdtEndsAt: null })).toBe(false);
  });
  it("CDT с бъдеща дата НЕ е изтекъл", () => {
    expect(isCdtExpired({ billingMode: "cdt_client", cdtEndsAt: future })).toBe(false);
  });
  it("нестандартните режими без CDT не се третират като изтекли", () => {
    expect(isCdtExpired({ billingMode: "standard", cdtEndsAt: past })).toBe(false);
    expect(isCdtExpired({ billingMode: "internal", cdtEndsAt: past })).toBe(false);
  });
});
