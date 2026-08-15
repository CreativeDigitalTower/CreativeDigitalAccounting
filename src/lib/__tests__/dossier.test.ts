import { describe, it, expect } from "vitest";
import { vehicleHistorySummary, clientSalesSummary } from "@/lib/logistics/dossier";

describe("vehicleHistorySummary", () => {
  it("агрегира курсове/тонове/първи-последен/продукти/дестинации", () => {
    const h = vehicleHistorySummary([
      { netQuantity: 26.14, dispatchDate: "2026-08-04", productName: "CEM II A-LL 52.5 N", destination: "Скопие" },
      { netQuantity: 23.8, dispatchDate: "2026-07-01", productName: "CEM II B-LL 42.5 R", destination: "Куманово" },
      { netQuantity: 25.0, dispatchDate: "2026-08-10", productName: "CEM II A-LL 52.5 N", destination: "Скопие" },
    ]);
    expect(h.trips).toBe(3);
    expect(h.totalTons).toBe(74.94);
    expect(h.firstTrip?.slice(0, 10)).toBe("2026-07-01");
    expect(h.lastTrip?.slice(0, 10)).toBe("2026-08-10");
    expect(h.products.length).toBe(2);
    expect(h.destinations).toContain("Скопие");
  });
  it("празно → нули", () => {
    const h = vehicleHistorySummary([]);
    expect(h.trips).toBe(0);
    expect(h.totalTons).toBe(0);
    expect(h.firstTrip).toBe(null);
  });
});

describe("clientSalesSummary", () => {
  it("оборот/количество/последна покупка/средна цена/по продукт", () => {
    const s = clientSalesSummary([
      { quantity: 10, grossAmount: 59000, product: "Cement A", date: "2026-08-01" },
      { quantity: 8, grossAmount: 47200, product: "Cement B", date: "2026-08-05" },
      { quantity: 2, grossAmount: 11800, product: "Cement A", date: "2026-07-01" },
    ], 2);
    expect(s.invoicesCount).toBe(2);
    expect(s.revenue).toBe(118000);
    expect(s.quantity).toBe(20);
    expect(s.lastPurchase?.slice(0, 10)).toBe("2026-08-05");
    expect(s.avgPricePerUnit).toBe(5900);
    expect(s.byProduct[0].product).toBe("Cement A"); // сортирано по оборот desc
    expect(s.byProduct.find((p) => p.product === "Cement A")?.quantity).toBe(12);
  });
  it("без продажби → нули, средна цена null", () => {
    const s = clientSalesSummary([], 0);
    expect(s.revenue).toBe(0);
    expect(s.avgPricePerUnit).toBe(null);
  });
});
