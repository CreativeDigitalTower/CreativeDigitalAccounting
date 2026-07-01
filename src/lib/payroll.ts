// Изчисление на заплати по българското законодателство (3-та категория труд).
// Ставки към 2025 г. Всички проценти работят и в EUR, и в BGN (относителни са).

export const PAYROLL_RATES = {
  // Осигуровки за сметка на служителя (удържат се от бруто)
  employee: {
    pension: 0.0658,       // ДОО – пенсии
    supPension: 0.022,     // ДЗПО (универсален пенсионен фонд)
    health: 0.032,         // Здравно осигуряване
    sickness: 0.014,       // Общо заболяване и майчинство
    unemployment: 0.004,   // Безработица
  },
  // Осигуровки за сметка на работодателя (върху бруто, отгоре)
  employer: {
    pension: 0.0872,       // ДОО – пенсии
    supPension: 0.028,     // ДЗПО
    health: 0.048,         // Здравно
    sickness: 0.021,       // Общо заболяване и майчинство
    unemployment: 0.006,   // Безработица
    accident: 0.004,       // ТЗПБ (Трудова злополука и проф. болест) – средно
  },
  taxRate: 0.10,           // Данък върху доходите (плосък 10%)
};

const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);

export const EMPLOYEE_SSC_RATE = sum(PAYROLL_RATES.employee); // 0.1378
export const EMPLOYER_SSC_RATE = sum(PAYROLL_RATES.employer); // 0.1932

export type PayrollBreakdown = {
  gross: number;         // Бруто заплата
  employeeSSC: number;   // Осигуровки за сметка на служителя
  taxBase: number;       // Данъчна основа (бруто − осигуровки на служителя)
  tax: number;           // Данък 10%
  net: number;           // Чиста сума за получаване
  employerSSC: number;   // Осигуровки за сметка на работодателя
  employerCost: number;  // Общ разход за работодателя (бруто + осигуровки работодател)
  insurancesTotal: number; // Общо осигуровки (служител + работодател)
};

export function calcPayroll(gross: number): PayrollBreakdown {
  const g = Math.max(0, gross || 0);
  const employeeSSC = round(g * EMPLOYEE_SSC_RATE);
  const taxBase = round(g - employeeSSC);
  const tax = round(taxBase * PAYROLL_RATES.taxRate);
  const net = round(g - employeeSSC - tax);
  const employerSSC = round(g * EMPLOYER_SSC_RATE);
  const employerCost = round(g + employerSSC);
  return {
    gross: round(g), employeeSSC, taxBase, tax, net,
    employerSSC, employerCost, insurancesTotal: round(employeeSSC + employerSSC),
  };
}

export function sumPayroll(grossValues: number[]): PayrollBreakdown {
  return grossValues.reduce<PayrollBreakdown>((acc, g) => {
    const b = calcPayroll(g);
    return {
      gross: acc.gross + b.gross, employeeSSC: acc.employeeSSC + b.employeeSSC,
      taxBase: acc.taxBase + b.taxBase, tax: acc.tax + b.tax, net: acc.net + b.net,
      employerSSC: acc.employerSSC + b.employerSSC, employerCost: acc.employerCost + b.employerCost,
      insurancesTotal: acc.insurancesTotal + b.insurancesTotal,
    };
  }, { gross: 0, employeeSSC: 0, taxBase: 0, tax: 0, net: 0, employerSSC: 0, employerCost: 0, insurancesTotal: 0 });
}

function round(n: number) { return Math.round(n * 100) / 100; }
