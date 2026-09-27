/**
 * Селекция на фактури по месечни групи (чиста, тествана логика). Един canonical Set от
 * invoice IDs; month header checkbox-ът работи САМО върху ID-тата на СВОЯ месец (§3/§14).
 */

/**
 * Toggle на цял месец върху глобалната селекция (additive union семантика, §5/§6/§10):
 *   - всички ID-та на месеца вече избрани (ALL) → махни ги (deselect само този месец);
 *   - иначе (NONE или SOME)                    → добави всички ID-та на месеца.
 * ID-тата на другите месеци остават непроменени; без дубликати (Set).
 */
export function toggleMonthSelection(selected: ReadonlySet<string>, monthIds: readonly string[]): Set<string> {
  const next = new Set(selected);
  const allSelected = monthIds.length > 0 && monthIds.every((id) => next.has(id));
  if (allSelected) for (const id of monthIds) next.delete(id);
  else for (const id of monthIds) next.add(id);
  return next;
}

/** Състояние на month header checkbox спрямо САМО неговите ID-та (§8/§9). */
export function monthCheckboxState(selected: ReadonlySet<string>, monthIds: readonly string[]): "none" | "some" | "all" {
  if (monthIds.length === 0) return "none";
  let count = 0;
  for (const id of monthIds) if (selected.has(id)) count++;
  if (count === 0) return "none";
  if (count === monthIds.length) return "all";
  return "some";
}
