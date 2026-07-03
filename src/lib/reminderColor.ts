/**
 * Цвят и етикет на напомняне според близостта на срока за изпълнение.
 * Оставащи 30 дни → нормално, ≤14 → жълто, ≤7 или просрочено → червено.
 */
export function reminderStatus(dueDate: string | Date, done = false): { color: string; bg: string; label: string; days: number } {
  const due = new Date(dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (done) return { color: "var(--muted)", bg: "rgba(120,120,110,.1)", label: "изпълнено", days };
  if (days < 0) return { color: "var(--brick)", bg: "var(--brick-soft)", label: `просрочено с ${-days} дни`, days };
  if (days === 0) return { color: "var(--brick)", bg: "var(--brick-soft)", label: "днес", days };
  if (days <= 7) return { color: "var(--brick)", bg: "var(--brick-soft)", label: `след ${days} дни`, days };
  if (days <= 14) return { color: "var(--brass)", bg: "var(--brass-soft)", label: `след ${days} дни`, days };
  return { color: "var(--emerald-dark)", bg: "rgba(15,138,106,.1)", label: `след ${days} дни`, days };
}

export const PRIORITY_META: Record<string, { label: string; color: string }> = {
  high: { label: "Висок", color: "var(--brick)" },
  normal: { label: "Нормален", color: "var(--navy)" },
  low: { label: "Нисък", color: "var(--muted)" },
};
