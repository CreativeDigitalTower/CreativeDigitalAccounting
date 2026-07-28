// ─────────────────────────────────────────────────────────────────────────
// Групирани права за документи (Кошче). Основани на ролята на потребителя във
// фирмата. Централизирано — използвай навсякъде (API + UI). Разширяемо: добави
// нова роля/право тук, без промяна по кода на страниците.
// ─────────────────────────────────────────────────────────────────────────

export type TrashPermission = "delete" | "restore" | "permanent";

// Матрица роля → права. Собственикът има всички. „permanent" (окончателно
// изтриване) е най-чувствителното — само собственик по подразбиране.
const ROLE_TRASH_PERMS: Record<string, TrashPermission[]> = {
  owner: ["delete", "restore", "permanent"],
  manager: ["delete", "restore"],
  accountant: ["delete", "restore"],
  sales: ["delete"],
  warehouse: ["delete"],
  viewer: [],
  employee: [],
};

/** Дали роля има конкретно право за Кошчето. Собственикът винаги има всичко. */
export function canTrash(role: string | null | undefined, perm: TrashPermission): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return (ROLE_TRASH_PERMS[role] ?? []).includes(perm);
}

/** Компактен набор от права за подаване към клиентски компоненти. */
export type TrashCaps = { canDelete: boolean; canRestore: boolean; canPermanent: boolean };
export function trashCaps(role: string | null | undefined): TrashCaps {
  return {
    canDelete: canTrash(role, "delete"),
    canRestore: canTrash(role, "restore"),
    canPermanent: canTrash(role, "permanent"),
  };
}
