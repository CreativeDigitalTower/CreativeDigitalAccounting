/**
 * Presentation resolver за export ФАКТУРАТА: показва seller/consignee/buyer с точната
 * АНГЛИЙСКА фирмена версия както в оригиналния образец (§5, §6). Company-scoped за
 * индивидуалния Logistics модул. НЕ променя master данните на фирмата, нито глобалните
 * CDA шаблони (§34) — само визуализацията на този документ.
 */
import { nameKey } from "@/lib/logistics/nameMatch";

type PartyLike = {
  name?: string | null; address?: string | null; city?: string | null; country?: string | null;
  [k: string]: unknown;
};

type EnIdentity = { name: string; address: string; city: string; country: string | null };

const EN_IDENTITIES: { match: (key: string) => boolean; identity: EnIdentity }[] = [
  {
    // Продавачът (BG): „Метал Трейд Кюстендил 2005" — латиница/кирилица/варианти
    // („Трейд" се транслитерира като „trejd", затова матчваме по „metal"+„kustendil").
    match: (k) => k.includes("metal") && k.includes("kustendil"),
    identity: { name: "METAL TRADE KUSTENDIL 2005 Ltd.", address: "23 Kaloyan Str.", city: "Kyustendil", country: "Bulgaria" },
  },
  {
    // Купувач/получател (MK): „Сем Интернационал" ДООЕЛ.
    match: (k) => k.startsWith("sem") && (k.includes("internacion") || k.includes("inernaion") || k.includes("internation")),
    identity: { name: "SEM INTERNATIONAL DOOEL", address: "55 Marshal Tito Str.", city: "Tetovo", country: "North Macedonia" },
  },
];

/**
 * Връща английската фирмена идентичност за фактурата, ако е разпозната; иначе оставя
 * подадения Party непроменен (той вече предпочита English snapshot където има).
 */
export function resolveInvoiceParty<T extends PartyLike>(party: T | null | undefined): T {
  if (!party) return { name: null } as unknown as T;
  const hit = EN_IDENTITIES.find((n) => n.match(nameKey(party.name)));
  if (!hit) return party;
  return { ...party, name: hit.identity.name, address: hit.identity.address, city: hit.identity.city, country: hit.identity.country };
}
