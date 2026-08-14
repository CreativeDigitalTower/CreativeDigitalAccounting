/**
 * DEV/TEST fixture по реална Holcim фактура №1430352748 (04.08.2026).
 * ⚠ Използва се САМО за тестове/разработка — НЕ се seed-ва като production фактура.
 * Илюстрира структурата: 1 фактура → N реда → N курса.
 */
export const HOLCIM_INVOICE_FIXTURE = {
  number: "1430352748",
  date: "2026-08-04",
  currency: "EUR",
  vatRate: 20,
  headerTaxBase: 10492.05,
  headerVatTotal: 2098.41,
  headerGrandTotal: 12590.46,
  lines: [
    { lineNumber: 10, materialCode: "14012840", product: "CEM II / A-LL 52.5 N", quantity: 26.14, unitPrice: 70.0, dispatchNote: "B0000313802", truck: "ST8669AE", net: 1829.8, vat: 365.96, gross: 2195.76 },
    { lineNumber: 11, materialCode: "14007073", product: "CEM II / B-LL 42.5 R", quantity: 23.8, unitPrice: 69.47, dispatchNote: "B0000313853", truck: "KH4788KB", net: 1653.39, vat: 330.68, gross: 1984.07 },
    { lineNumber: 21, materialCode: "14007073", product: "CEM II / B-LL 42.5 R", quantity: 23.8, unitPrice: 69.47, dispatchNote: "B0000313858", truck: "KH8165KA", net: 1653.39, vat: 330.68, gross: 1984.07 },
    { lineNumber: 23, materialCode: "14008014", product: "CEM II / A-LL 42.5 R", quantity: 25.68, unitPrice: 66.91, dispatchNote: "B0000313881", truck: "SK7503BV", net: 1718.25, vat: 343.65, gross: 2061.9 },
    { lineNumber: 24, materialCode: "14008014", product: "CEM II / A-LL 42.5 R", quantity: 27.08, unitPrice: 66.91, dispatchNote: "B0000313888", truck: "SK5189BA", net: 1811.92, vat: 362.38, gross: 2174.3 },
    { lineNumber: 25, materialCode: "14008014", product: "CEM II / A-LL 42.5 R", quantity: 27.28, unitPrice: 66.91, dispatchNote: "B0000313890", truck: "SK3832BO", net: 1825.3, vat: 365.06, gross: 2190.36 },
  ],
} as const;
