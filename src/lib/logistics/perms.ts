/**
 * Чисти права по роля за логистичния модул (без DB импорти → тестируемо изолирано).
 * По модела на permissions.ts.
 */
export type LogisticsPermission =
  | "view_logistics"
  | "manage_shipments"
  | "manage_documents"
  | "manage_invoices"
  | "manage_rates"
  | "manage_historical"
  | "view_analytics";

const ROLE_LOGISTICS_PERMS: Record<string, LogisticsPermission[]> = {
  owner: ["view_logistics", "manage_shipments", "manage_documents", "manage_invoices", "manage_rates", "manage_historical", "view_analytics"],
  manager: ["view_logistics", "manage_shipments", "manage_documents", "manage_invoices", "manage_rates", "manage_historical", "view_analytics"],
  accountant: ["view_logistics", "manage_documents", "manage_invoices", "view_analytics"],
  sales: ["view_logistics", "manage_shipments", "manage_documents", "view_analytics"],
  warehouse: ["view_logistics", "manage_shipments", "manage_documents"],
  viewer: ["view_logistics", "view_analytics"],
  employee: [],
};

/**
 * Ефективна роля за проверка на права: Super Admin (вкл. technical access /
 * импърсонация, при която не е член на фирмата) получава „owner" → пълен достъп.
 * Иначе — реалната роля във фирмата.
 */
export function effectiveRole(isSuperAdmin: boolean, role: string | null | undefined): string | null {
  if (isSuperAdmin) return "owner";
  return role ?? null;
}

export function canLogistics(role: string | null | undefined, perm: LogisticsPermission): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return (ROLE_LOGISTICS_PERMS[role] ?? []).includes(perm);
}

export type LogisticsCaps = Record<LogisticsPermission, boolean>;
export function logisticsCaps(role: string | null | undefined): LogisticsCaps {
  const perms: LogisticsPermission[] = [
    "view_logistics", "manage_shipments", "manage_documents", "manage_invoices",
    "manage_rates", "manage_historical", "view_analytics",
  ];
  return Object.fromEntries(perms.map((p) => [p, canLogistics(role, p)])) as LogisticsCaps;
}
