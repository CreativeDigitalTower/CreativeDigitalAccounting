/**
 * Разделяне на actor (реалния логнат потребител) от context (потребителя/фирмата,
 * в чийто контекст се извършват company-scoped операции).
 *
 * Проблем: при Super Admin technical access (impersonation) session.user остава
 * Super Admin-ът, затова „Моите фирми"/create ползваха неговия личен контекст.
 * Тук са ЧИСТИТЕ решения (без DB) — резолвинг на контекста и orphan защита.
 */

export type ActorContextInput = {
  sessionUserId: string;
  isSuperAdmin: boolean;
  impersonatedCompanyId: string | null;   // валиден target company при technical access
  targetOwnerUserId: string | null;        // owner на target company (ако е известен)
};
export type ActorContext = {
  actorUserId: string;         // кой ИЗВЪРШВА действието (за audit)
  contextUserId: string | null; // чии фирми/собственост управляваме (target owner при impersonation)
  impersonating: boolean;
};

/**
 * Резолва ефективния контекст:
 *  - нормален режим → actor = context = session user;
 *  - Super Admin technical access → actor = SA, context = owner на target фирмата
 *    (SA НЕ става собственик).
 */
export function resolveActorContext(i: ActorContextInput): ActorContext {
  const impersonating = !!i.isSuperAdmin && !!i.impersonatedCompanyId;
  if (impersonating) {
    return { actorUserId: i.sessionUserId, contextUserId: i.targetOwnerUserId, impersonating: true };
  }
  return { actorUserId: i.sessionUserId, contextUserId: i.sessionUserId, impersonating: false };
}

/**
 * Orphan защита: дали премахването на членство би оставило фирмата без нито един
 * собственик. `ownerUserIds` = текущите owner членове; `removingUserId` = който махаме.
 */
export function wouldOrphanCompany(ownerUserIds: string[], removingUserId: string): boolean {
  const remaining = ownerUserIds.filter((id) => id !== removingUserId);
  return remaining.length === 0;
}
