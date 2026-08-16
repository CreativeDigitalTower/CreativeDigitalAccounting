/**
 * Чисти права по роля за модул „Модно производство" (без DB импорти → тестируемо
 * изолирано). По модела на logistics/perms.ts.
 *
 * Costing/margin информацията е разделена в отделни права (view_costing/manage_costing),
 * за да може да бъде ограничена за определени роли (изискване §34).
 */
export type FashionPermission =
  | "view_fashion"
  | "manage_materials"
  | "manage_deliveries"
  | "manage_styles"
  | "manage_patterns"
  | "manage_bom"
  | "manage_production"
  | "manage_cutting"
  | "manage_qc"
  | "manage_finished_goods"
  | "manage_sales_reports"
  | "view_costing"
  | "manage_costing"
  | "view_analytics"
  | "manage_settings";

export const FASHION_PERMISSIONS: FashionPermission[] = [
  "view_fashion", "manage_materials", "manage_deliveries", "manage_styles", "manage_patterns",
  "manage_bom", "manage_production", "manage_cutting", "manage_qc", "manage_finished_goods",
  "manage_sales_reports", "view_costing", "manage_costing", "view_analytics", "manage_settings",
];

const ROLE_FASHION_PERMS: Record<string, FashionPermission[]> = {
  owner: [...FASHION_PERMISSIONS],
  manager: [...FASHION_PERMISSIONS],
  // Счетоводителят вижда себестойност/анализи, но не управлява производството.
  accountant: ["view_fashion", "view_costing", "view_analytics", "manage_sales_reports"],
  // Оператор в цеха: материали/кроене/производство/QC, но без себестойност/цени.
  warehouse: ["view_fashion", "manage_materials", "manage_deliveries", "manage_cutting", "manage_production", "manage_qc", "manage_finished_goods"],
  sales: ["view_fashion", "manage_sales_reports", "view_analytics"],
  viewer: ["view_fashion", "view_analytics"],
  employee: [],
};

/** Ефективна роля: Super Admin → „owner" (пълен достъп), иначе реалната роля. */
export function effectiveFashionRole(isSuperAdmin: boolean, role: string | null | undefined): string | null {
  if (isSuperAdmin) return "owner";
  return role ?? null;
}

export function canFashion(role: string | null | undefined, perm: FashionPermission): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return (ROLE_FASHION_PERMS[role] ?? []).includes(perm);
}

export type FashionCaps = Record<FashionPermission, boolean>;
export function fashionCaps(role: string | null | undefined): FashionCaps {
  return Object.fromEntries(FASHION_PERMISSIONS.map((p) => [p, canFashion(role, p)])) as FashionCaps;
}
