import type { TFunc } from "./messages";

/** Известие, което може да носи преводен ключ + payload (нов формат) или
 *  вече готов текст (легаси записи). */
export type NotifLike = {
  titleKey?: string | null;
  bodyKey?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  title?: string | null;
  body?: string | null;
};

/**
 * Превежда известие на текущия език. Резолвва вложени кодове в payload-а
 * (вид документ, план), за да не съхраняваме преведен текст в базата.
 */
export function renderNotif(t: TFunc, n: NotifLike): { title: string; body: string | null } {
  const vars: Record<string, string | number> = { ...(n.data ?? {}) };
  if (vars.type) vars.docType = t(`notifications.docTypes.${vars.type}`);
  if (vars.plan) vars.plan = t(`emails.plans.${vars.plan}`);
  const title = n.titleKey ? t(n.titleKey, vars) : n.title ?? "";
  const body = n.bodyKey ? t(n.bodyKey, vars) : n.body ?? null;
  return { title, body };
}
