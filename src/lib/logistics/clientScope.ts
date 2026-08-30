/**
 * Чиста логика за cross-company достъп до крайния клиент на експортна доставка (§2/§3).
 * Полето „Краен клиент / До:" сочи клиент на СВЪРЗАНАТА buyer фирма (SEM), не на активната
 * (BG). Cross-company е позволен САМО в рамките на същата CompanyGroup — тук е проверката,
 * DB заявките (groupCounterparties/client) остават в API-то.
 */

/** buyer фирмата валидна ли е като свързан контрагент в групата (§3). */
export function isLinkedBuyer(buyerCompanyId: string | null | undefined, counterpartyIds: readonly string[]): boolean {
  return !!buyerCompanyId && counterpartyIds.includes(buyerCompanyId);
}

/**
 * Позволен ли е клиент с даден companyId за доставката: собствен (активната фирма, legacy)
 * ИЛИ на buyer фирмата (SEM). buyer се подава само след валидиране, че е в групата.
 */
export function clientCompanyAllowed(
  clientCompanyId: string,
  opts: { activeCompanyId: string; buyerCompanyId?: string | null; groupCounterpartyIds?: readonly string[] },
): boolean {
  if (clientCompanyId === opts.activeCompanyId) return true;
  if (opts.buyerCompanyId && clientCompanyId === opts.buyerCompanyId) return true;
  // При редакция клиентът може да е на друг свързан контрагент от групата.
  if (opts.groupCounterpartyIds && opts.groupCounterpartyIds.includes(clientCompanyId)) return true;
  return false;
}
