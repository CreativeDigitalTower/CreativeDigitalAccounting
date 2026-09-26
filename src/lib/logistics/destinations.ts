/**
 * Дестинации (крайни места на доставка) като master data (§3/§4). Чиста, тествана логика +
 * idempotent maintenance/backfill. Source of truth за СТАТИСТИКИТЕ е `ExportDocumentSet`
 * (§7/§9) — match по `destinationId` или, за legacy записи без връзка, по нормализирано име.
 *
 * Разграничения (§14): Destination ≠ Route (маршрут ДО дестинацията) ≠ Terms of Delivery
 * (Incoterm FCA/CPT). Тук пазим само мястото на доставка.
 */
import type { PrismaClient } from "@prisma/client";
import { normalizeDestination, MK_DESTINATIONS } from "@/lib/logistics/deliveryTerms";
import { SEED_DESTINATIONS } from "@/lib/logistics/masterData";

export type SeedDestination = { name: string; country: string | null; active: boolean };
type CanonicalDestination = { name: string; country: string | null; active: boolean; aliases: string[] };

/**
 * Canonical дестинации + потвърдени alias/spelling варианти (кирилица/латиница), които сочат
 * едно и също реално място (§1/§13). Всеки вариант се събира в ЕДИН master запис — без
 * duplicates. Транслитерацията (normalizeDestination) не сплита всички варианти (напр.
 * кирилско „Кочани" → „kocani" ≠ латинско „kochani"), затова aliases са явни и доказани.
 */
const CANONICAL_DESTINATIONS: CanonicalDestination[] = [
  // ── Active (реални места на доставка в Северна Македония) ──
  { name: "Skopie", country: "North Macedonia", active: true, aliases: ["Skopje", "Скопие", "Скопjе", "FCA SKOPIE", "FCA СКОПИЕ"] },
  { name: "Kumanovo", country: "North Macedonia", active: true, aliases: ["Куманово", "FCA КУМАНОВО"] },
  { name: "Strumica", country: "North Macedonia", active: true, aliases: ["Струмица"] },
  { name: "Vinica", country: "North Macedonia", active: true, aliases: ["Виница"] },
  { name: "Tetovo", country: "North Macedonia", active: true, aliases: ["Тетово"] },
  { name: "Kriva Palanka", country: "North Macedonia", active: true, aliases: ["Кр. Паланка", "Кр.Паланка", "Крива Паланка", "FCA КР.ПАЛАНКА", "Kr. Palanka"] },
  { name: "Shtip", country: "North Macedonia", active: true, aliases: ["Штип", "Stip"] },
  { name: "Kochani", country: "North Macedonia", active: true, aliases: ["Кочани", "FCA КОЧАНИ"] },
  { name: "Rankovce", country: "North Macedonia", active: true, aliases: ["Ранковце", "FCA РАНКОВЦЕ"] },
  // ── Inactive (изрично премахнатите 12; alias вариантите НЕ създават нови записи) ──
  { name: "Batinci", country: "North Macedonia", active: false, aliases: ["Батинци"] },
  { name: "Butel", country: "North Macedonia", active: false, aliases: ["Бутел"] },
  { name: "Dolno Konjari", country: "North Macedonia", active: false, aliases: ["Долно Коњари", "Долно Конјари", "Dolno Konjare"] },
  { name: "Gostivar", country: "North Macedonia", active: false, aliases: ["Гостивар"] },
  { name: "Jakimovo", country: "North Macedonia", active: false, aliases: ["Јакимово", "Якимово"] },
  { name: "Lipkovo", country: "North Macedonia", active: false, aliases: ["Липково"] },
  { name: "Nikushtak", country: "North Macedonia", active: false, aliases: ["Никуштак", "Nikustak"] },
  { name: "Orizari", country: "North Macedonia", active: false, aliases: ["Оризари"] },
  { name: "Petrovec", country: "North Macedonia", active: false, aliases: ["Petrovac", "Петровец", "Петровац"] },
  { name: "Rzanicino", country: "North Macedonia", active: false, aliases: ["Ржаничино", "Рзаничино", "Ržaničino"] },
  { name: "Vizbegovo", country: "North Macedonia", active: false, aliases: ["Визбегово"] },
  { name: "Vraca", country: "Bulgaria", active: false, aliases: ["Vratsa", "Враца"] },
];

/**
 * Премахва прикачен Incoterm/условие суфикс от display име: „Skopie / FCA SKOPIE" → „Skopie"
 * (§2). Реже само на разделител „/"; имена със спейс без „/" (напр. „Kriva Palanka") остават.
 */
export function stripDeliveryTermSuffix(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const slash = s.indexOf("/");
  return (slash >= 0 ? s.slice(0, slash) : s).trim();
}

// variant нормализиран ключ → canonical display име (за събиране на доказани еквиваленти).
const ALIAS_TO_CANONICAL: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const c of CANONICAL_DESTINATIONS) {
    for (const variant of [c.name, ...c.aliases]) {
      const k = normalizeDestination(stripDeliveryTermSuffix(variant));
      if (k) m.set(k, c.name);
    }
  }
  return m;
})();

/**
 * Canonical резолвиране на дестинация: чисти суфикса, събира доказани alias варианти в едно
 * canonical име и връща стабилен ключ (§1/§13). Непознати стойности запазват своето почистено
 * име (без загуба) — просто не се сливат с нищо.
 */
export function canonicalDestination(raw: string | null | undefined): { name: string; key: string } {
  const cleaned = stripDeliveryTermSuffix(raw);
  const variantKey = normalizeDestination(cleaned);
  const name = ALIAS_TO_CANONICAL.get(variantKey) ?? cleaned;
  return { name, key: normalizeDestination(name) };
}

/** Само canonical ключът (за dedupe/match/backfill навсякъде). */
export function canonicalDestinationKey(raw: string | null | undefined): string {
  return canonicalDestination(raw).key;
}

/** Пълният начален списък (idempotent seed) — canonical имена, без duplicates. */
export const SEED_DESTINATION_RECORDS: SeedDestination[] = CANONICAL_DESTINATIONS.map((c) => ({ name: c.name, country: c.country, active: c.active }));

/** Точно 12-те canonical inactive имена (alias вариантите се сливат в тях, не се дублират). */
export const INACTIVE_DESTINATION_NAMES: string[] = CANONICAL_DESTINATIONS.filter((c) => !c.active).map((c) => c.name);

/** Canonical нормализирани ключове на неактивните (за бърза проверка на legacy низове). */
export const INACTIVE_NORMALIZED_KEYS = new Set(INACTIVE_DESTINATION_NAMES.map(normalizeDestination).filter(Boolean));

/** Държава по canonical ключ (само за потвърдените seed записи; иначе null — не се измисля). */
export const COUNTRY_BY_KEY: Map<string, string | null> = new Map(CANONICAL_DESTINATIONS.map((c) => [normalizeDestination(c.name), c.country]));

/** Дали (canonical ключът на) низа е сред неактивните дестинации. */
export function isInactiveDestinationName(raw: string | null | undefined): boolean {
  const key = canonicalDestinationKey(raw);
  return !!key && INACTIVE_NORMALIZED_KEYS.has(key);
}

/**
 * Idempotent създаване/корекция на master дестинациите за фирма (§17/§18). Повторно пускане
 * НЕ създава дубликати (upsert по companyId+normalizedName). Не трие нищо. Стъпки:
 *   1) upsert на seed записите (активни се създават; неактивните се коригират до active=false);
 *   2) „Skopie / FCA SKOPIE" → master display name „Skopie" (§2/§18);
 *   3) внасяне на исторически използвани дестинации (legacy) — без загуба (§13);
 *   4) backfill на ExportDocumentSet.destinationId по нормализирано име (без пипане на snapshot).
 */
export async function maintainDestinations(prisma: PrismaClient, companyId: string): Promise<{ created: number; deactivated: number; backfilled: number; skipped?: string }> {
  let created = 0, deactivated = 0, backfilled = 0;

  // §2/§10: Canonical owner = фирмата, която СЪЗДАВА експортни доставки (продавачът, напр.
  // Metal Trade). Купувачите (logisticsExportCreate=false, напр. SEM) НЕ получават собствено
  // копие на номенклатурата — те виждат историята през споделените export sets. Така не
  // дублираме 25×2 master записи без архитектурна причина.
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { logisticsExportCreate: true } });
  if (company && company.logisticsExportCreate === false) {
    return { created: 0, deactivated: 0, backfilled: 0, skipped: "buyer-company (logisticsExportCreate=false)" };
  }

  // 1) + 2) seed upsert. За неактивните форсираме active=false и при update (корекция на prod).
  for (const rec of SEED_DESTINATION_RECORDS) {
    const key = normalizeDestination(rec.name);
    if (!key) continue;
    const existing = await prisma.logisticsDestination.findUnique({
      where: { companyId_normalizedName: { companyId, normalizedName: key } }, select: { id: true, active: true },
    });
    if (!existing) {
      await prisma.logisticsDestination.create({
        data: { companyId, name: rec.name, normalizedName: key, country: rec.country, active: rec.active },
      });
      created++;
      if (!rec.active) deactivated++;
    } else if (!rec.active && existing.active) {
      // Корекция: маркирай неактивна (без да пипаш history/snapshots).
      await prisma.logisticsDestination.update({ where: { id: existing.id }, data: { active: false } });
      deactivated++;
    } else if (rec.name === "Skopie") {
      // §2: нормализирай display името (маха „/ FCA SKOPIE").
      await prisma.logisticsDestination.update({ where: { id: existing.id }, data: { name: "Skopie" } });
    }
  }

  // 3) Внасяне на ВСИЧКИ legacy дестинации (recovery), за да не се губи нищо от работещия
  //    преди PR #213 dropdown (§4): export sets + маршрути (toPlace) + курсове (Shipment)
  //    + стария hardcoded MK_DESTINATIONS + Cyrillic seed. Приоритетът е structured данни;
  //    за низовете НЕ измисляме адрес — остава nullable (§4/§5).
  const [usedSets, routes, shipments] = await Promise.all([
    prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
    prisma.logisticsRoute.findMany({ where: { companyId }, select: { toPlace: true } }),
    prisma.shipment.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"] }),
  ]);
  const legacyRaw = [
    ...usedSets.map((s) => s.destination),
    ...routes.map((r) => r.toPlace),
    ...shipments.map((s) => s.destination),
    ...MK_DESTINATIONS,
    ...SEED_DESTINATIONS,
  ];
  // dedupe по CANONICAL ключ (alias варианти → едно място), с canonical display име.
  const seen = new Set<string>();
  for (const raw of legacyRaw) {
    const { name: display, key } = canonicalDestination(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existing = await prisma.logisticsDestination.findUnique({
      where: { companyId_normalizedName: { companyId, normalizedName: key } }, select: { id: true },
    });
    if (!existing) {
      const inactive = INACTIVE_NORMALIZED_KEYS.has(key);
      await prisma.logisticsDestination.create({
        data: { companyId, name: display, normalizedName: key, country: COUNTRY_BY_KEY.get(key) ?? null, active: !inactive },
      });
      created++;
      if (inactive) deactivated++;
    }
  }

  // 4) Backfill на destinationId за export sets без връзка (snapshot низът остава непроменен).
  const master = await prisma.logisticsDestination.findMany({ where: { companyId }, select: { id: true, normalizedName: true } });
  const byKey = new Map(master.map((m) => [m.normalizedName, m.id]));
  const unlinked = await prisma.exportDocumentSet.findMany({
    where: { companyId, destinationId: null, destination: { not: null } }, select: { id: true, destination: true },
  });
  for (const s of unlinked) {
    const key = canonicalDestinationKey(s.destination);
    const id = key ? byKey.get(key) : undefined;
    if (id) { await prisma.exportDocumentSet.update({ where: { id: s.id }, data: { destinationId: id } }); backfilled++; }
  }

  return { created, deactivated, backfilled };
}

/**
 * Имената на дестинациите за dropdown-а на НОВА/редактирана експортна доставка (§6/§8).
 * Canonical source = active LogisticsDestination master. TRANSITIONAL SAFETY NET: ако master
 * таблицата още НЕ е населена (backfill не е пуснат), НЕ връщаме празен списък — fallback към
 * възстановимите legacy дестинации (маршрути + използвани + стария MK_DESTINATIONS/seed),
 * почистени и без 12-те неактивни. След успешен backfill master остава единствен източник.
 */
export async function resolveActiveDestinationNames(prisma: PrismaClient, companyId: string): Promise<{ names: string[]; source: "master" | "legacy-fallback" }> {
  const master = await prisma.logisticsDestination.findMany({
    where: { companyId, active: true }, select: { name: true }, orderBy: { name: "asc" },
  });
  if (master.length > 0) return { names: master.map((m) => m.name), source: "master" };

  const [routes, used, shipments] = await Promise.all([
    prisma.logisticsRoute.findMany({ where: { companyId, active: true }, select: { toPlace: true } }),
    prisma.exportDocumentSet.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, take: 2000 }),
    prisma.shipment.findMany({ where: { companyId, destination: { not: null } }, select: { destination: true }, take: 2000 }),
  ]);
  // Събиране по CANONICAL ключ (alias варианти → едно canonical име), без 12-те неактивни (§3).
  const all = [
    ...MK_DESTINATIONS, ...SEED_DESTINATIONS,
    ...routes.map((r) => r.toPlace), ...used.map((s) => s.destination), ...shipments.map((s) => s.destination),
  ];
  const byKey = new Map<string, string>();
  for (const raw of all) {
    const { name, key } = canonicalDestination(raw);
    if (!key || byKey.has(key) || INACTIVE_NORMALIZED_KEYS.has(key)) continue;
    byKey.set(key, name);
  }
  return { names: [...byKey.values()].sort(), source: "legacy-fallback" };
}

// ─────────────── Статистика по дестинация (§8/§9/§11) ───────────────

export type DeliveryRow = {
  id: string;
  shipmentDate: Date | null;
  quantity: number | null;
  unit: string | null;
  productSnapshot: string | null;
  truckRegSnapshot: string | null;
  invoiceNumber: string | null;
};

/** Decimal-safe сумиране (в стотни от тона) — без float drift (§20.11). */
function addTons(acc: number, q: number | null | undefined): number {
  return acc + Math.round((q ?? 0) * 100);
}
const toTons = (hundredths: number) => Math.round(hundredths) / 100;

export type DestinationStats = {
  totalDeliveries: number;
  totalQuantity: number;
  deliveriesThisMonth: number;
  quantityThisMonth: number;
  quantityThisYear: number;
  avgQuantity: number;
  lastDeliveryAt: string | null;
  topTruck: string | null;
  distinctTrucks: number;
  topProduct: string | null;
  products: { name: string; quantity: number }[];
  byMonth: { month: string; deliveries: number; quantity: number }[];
};

/**
 * Изчислява статистиките от реалните export set доставки (canonical source, §9). Не дублира
 * количества от документите. `now` е инжектируемо за тестове.
 */
export function aggregateDestinationDeliveries(rows: DeliveryRow[], now: Date = new Date()): DestinationStats {
  const y = now.getFullYear(), m = now.getMonth();
  let totalH = 0, monthH = 0, yearH = 0, monthCount = 0;
  let last: Date | null = null;
  const truckCount = new Map<string, number>();
  const productH = new Map<string, number>();
  const monthMap = new Map<string, { deliveries: number; h: number }>();

  for (const r of rows) {
    totalH = addTons(totalH, r.quantity);
    const d = r.shipmentDate ? new Date(r.shipmentDate) : null;
    if (d) {
      if (!last || d.getTime() > last.getTime()) last = d;
      if (d.getFullYear() === y) {
        yearH = addTons(yearH, r.quantity);
        if (d.getMonth() === m) { monthH = addTons(monthH, r.quantity); monthCount++; }
      }
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(mk) ?? { deliveries: 0, h: 0 };
      cur.deliveries++; cur.h = addTons(cur.h, r.quantity); monthMap.set(mk, cur);
    }
    const truck = (r.truckRegSnapshot ?? "").trim();
    if (truck) truckCount.set(truck, (truckCount.get(truck) ?? 0) + 1);
    const prod = (r.productSnapshot ?? "").trim();
    if (prod) productH.set(prod, addTons(productH.get(prod) ?? 0, r.quantity));
  }

  const total = rows.length;
  const products = [...productH.entries()].map(([name, h]) => ({ name, quantity: toTons(h) })).sort((a, b) => b.quantity - a.quantity);
  const topTruckEntry = [...truckCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const byMonth = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, deliveries: v.deliveries, quantity: toTons(v.h) }));

  return {
    totalDeliveries: total,
    totalQuantity: toTons(totalH),
    deliveriesThisMonth: monthCount,
    quantityThisMonth: toTons(monthH),
    quantityThisYear: toTons(yearH),
    avgQuantity: total > 0 ? toTons(Math.round(totalH / total)) : 0,
    lastDeliveryAt: last ? last.toISOString() : null,
    topTruck: topTruckEntry ? topTruckEntry[0] : null,
    distinctTrucks: truckCount.size,
    topProduct: products[0]?.name ?? null,
    products,
    byMonth,
  };
}
