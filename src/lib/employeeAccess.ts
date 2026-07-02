/**
 * Конфигурация какви модули вижда роля „служител" в портала за самообслужване.
 * Данните са само за ЧЕТЕНЕ и с МАСКИРАНИ чувствителни полета (финанси, контакти
 * на клиенти), за да не изтичат данни или клиенти.
 */
export type EmployeeAccess = {
  clients: boolean;
  projects: boolean;
  suppliers: boolean;
  warehouse: boolean;
};

export const EMPLOYEE_ACCESS_MODULES: { key: keyof EmployeeAccess; label: string; note: string }[] = [
  { key: "clients", label: "Клиенти", note: "само имена — без финанси и контакти" },
  { key: "projects", label: "Проекти", note: "име, статус, срок — без стойности" },
  { key: "suppliers", label: "Доставчици", note: "само имена и град" },
  { key: "warehouse", label: "Склад", note: "артикули и наличности — без цени" },
];

const DEFAULT: EmployeeAccess = { clients: false, projects: false, suppliers: false, warehouse: false };

/** Парсва JSON конфигурацията; по подразбиране всичко е ИЗКЛЮЧЕНО (сигурно). */
export function parseEmployeeAccess(json: string | null | undefined): EmployeeAccess {
  if (!json) return { ...DEFAULT };
  try {
    const o = JSON.parse(json);
    return {
      clients: !!o.clients, projects: !!o.projects,
      suppliers: !!o.suppliers, warehouse: !!o.warehouse,
    };
  } catch {
    return { ...DEFAULT };
  }
}
