import { describe, it, expect } from "vitest";
import {
  proformaLinesToInvoiceDraft,
  proformaDescribesPlan,
  isLiveProformaStatus,
} from "@/lib/proforma";

describe("proformaLinesToInvoiceDraft", () => {
  it("прехвърля редовете 1:1 без промяна на суми/ставки", () => {
    const out = proformaLinesToInvoiceDraft([
      { description: "Услуга A", quantity: 2, unitPrice: 50, vatRate: 20 },
      { description: "Услуга B", quantity: 1, unitPrice: 100, vatRate: 0 },
    ]);
    expect(out).toEqual([
      { description: "Услуга A", quantity: 2, unitPrice: 50, vatRate: 20 },
      { description: "Услуга B", quantity: 1, unitPrice: 100, vatRate: 0 },
    ]);
  });
  it("празен вход → празен изход", () => {
    expect(proformaLinesToInvoiceDraft([])).toEqual([]);
  });
});

describe("proformaDescribesPlan", () => {
  it("разпознава плана по име в описанието (нечувствително към регистър)", () => {
    expect(proformaDescribesPlan("Абонамент Creative Digital Accounting — Про (Месечно)", "pro")).toBe(true);
    expect(proformaDescribesPlan("абонамент про — 1 месец", "pro")).toBe(true);
    expect(proformaDescribesPlan("Абонамент — Бизнес", "business")).toBe(true);
  });
  it("не бърка различни планове", () => {
    expect(proformaDescribesPlan("Абонамент — Старт", "pro")).toBe(false);
    expect(proformaDescribesPlan("Абонамент — Бизнес", "start")).toBe(false);
  });
});

describe("isLiveProformaStatus", () => {
  it("анулираната не блокира нова проформа", () => {
    expect(isLiveProformaStatus("cancelled")).toBe(false);
  });
  it("всички останали статуси са „живи“", () => {
    for (const s of ["draft", "issued", "sent", "paid", "overdue", "partially_paid"]) {
      expect(isLiveProformaStatus(s)).toBe(true);
    }
  });
});
