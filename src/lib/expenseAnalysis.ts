// Чисти функции за анализ на разходите — групиране по категория/доставчик/проект
// и месечна серия. Тествани; ползват се от страницата „Разходи".

export type ExpenseForAnalysis = {
  amount: number;
  date: Date | string;
  categoryName?: string | null;
  supplierName?: string | null;
  projectName?: string | null;
};

export type GroupRow = { name: string; total: number; count: number };

const UNSET = "—";

/** Групира разходите по избрано поле и връща сортирано низходящо по сума. */
export function groupExpenses(expenses: ExpenseForAnalysis[], by: "category" | "supplier" | "project"): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const e of expenses) {
    const name = (by === "category" ? e.categoryName : by === "supplier" ? e.supplierName : e.projectName)?.trim() || UNSET;
    const row = map.get(name) ?? { name, total: 0, count: 0 };
    row.total += e.amount; row.count += 1;
    map.set(name, row);
  }
  return [...map.values()]
    .map((r) => ({ ...r, total: +r.total.toFixed(2) }))
    .sort((a, b) => b.total - a.total);
}

/** Месечна серия (12 стойности) за дадена година. */
export function monthlyTotals(expenses: ExpenseForAnalysis[], year: number): number[] {
  const months = new Array(12).fill(0);
  for (const e of expenses) {
    const d = new Date(e.date);
    if (d.getFullYear() === year) months[d.getMonth()] += e.amount;
  }
  return months.map((n) => +n.toFixed(2));
}

/** Общо за списък разходи. */
export function totalExpenses(expenses: ExpenseForAnalysis[]): number {
  return +expenses.reduce((s, e) => s + e.amount, 0).toFixed(2);
}
