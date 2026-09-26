/**
 * Дестинации (крайни места на доставка) като master data (§3/§4). Чиста, тествана логика +
 * idempotent maintenance/backfill. Source of truth за СТАТИСТИКИТЕ е `ExportDocumentSet`
 * (§7/§9) — match по `destinationId` или, за legacy записи без връзка, по нормализирано име.
 *
 * Разграничения (§14): Destination ≠ Route (маршрут ДО дестинацията) ≠ Terms of Delivery
 * (Incoterm FCA/CPT). Тук пазим само мястото на доставка.
 */
import type { PrismaClient } from "@prisma/client";
import { normalizeDestination } from "@/lib/logistics/deliveryTerms";

export type SeedDestination = { name: string; country: string | null; active: boolean };

/** Активни начални дестинации (Северна Македония) — потвърдените реални места на доставка. */
const ACTIVE_SEED: SeedDestination[] = [
  { name: "Skopie", country: "North Macedonia", active: true },
  { name: "Kumanovo", country: "North Macedonia", active: true },
  { name: "Strumica", country: "North Macedonia", active: true },
  { name: "Vinica", country: "North Macedonia", active: true },
  { name: "Tetovo", country: "North Macedonia", active: true },
  { name: "Kriva Palanka", country: "North Macedonia", active: true },
  { name: "Shtip", country: "North Macedonia", active: true },
  { name: "Kochani", country: "North Macedonia", active: true },
  { name: "Rankovce", country: "North Macedonia", active: true },
];

/**
 * Дестинации, които клиентът потвърди, че НЕ трябва да са активни (§1/§17). Държат се като
 * inactive master записи (никакво триене) — не се предлагат при нови доставки, но историята
 * остава. „Vraca" (Враца) е логистична зона в BG, не крайна дестинация.
 */
export const INACTIVE_DESTINATION_NAMES: string[] = [
  "Batinci", "Butel", "Dolno Konjari", "Gostivar", "Jakimovo", "Lipkovo",
  "Nikushtak", "Orizari", "Petrovac", "Petrovec", "Rzanicino", "Vizbegovo",
  "Vraca", "Vratsa", "Враца",
];

const INACTIVE_SEED: SeedDestination[] = INACTIVE_DESTINATION_NAMES.map((name) => ({
  name, country: name === "Vraca" || name === "Vratsa" || name === "Враца" ? "Bulgaria" : "North Macedonia", active: false,
}));

/** Пълният начален списък (idempotent seed). */
export const SEED_DESTINATION_RECORDS: SeedDestination[] = [...ACTIVE_SEED, ...INACTIVE_SEED];

/** Нормализирани ключове на неактивните (за бърза проверка на legacy низове). */
export const INACTIVE_NORMALIZED_KEYS = new Set(INACTIVE_DESTINATION_NAMES.map(normalizeDestination).filter(Boolean));

/**
 * Премахва прикачен Incoterm/условие суфикс от display име: „Skopie / FCA SKOPIE" → „Skopie"
 * (§2). Реже само на разделител „ / "; имена със спейс без „/" (напр. „Kriva Palanka") остават.
 */
export function stripDeliveryTermSuffix(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const slash = s.indexOf("/");
  return (slash >= 0 ? s.slice(0, slash) : s).trim();
}

/** Дали нормализираният ключ на низа е сред неактивните дестинации. */
export function isInactiveDestinationName(raw: string | null | undefined): boolean {
  const key = normalizeDestination(stripDeliveryTermSuffix(raw));
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
export async function maintainDestinations(prisma: PrismaClient, companyId: string): Promise<{ created: number; deactivated: number; backfilled: number }> {
  let created = 0, deactivated = 0, backfilled = 0;

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

  // 3) Внасяне на legacy използвани дестинации (от export sets), за да не се губи информация.
  const used = await prisma.exportDocumentSet.findMany({
    where: { companyId, destination: { not: null } }, select: { destination: true }, distinct: ["destination"],
  });
  for (const u of used) {
    const display = stripDeliveryTermSuffix(u.destination);
    const key = normalizeDestination(display);
    if (!key) continue;
    const existing = await prisma.logisticsDestination.findUnique({
      where: { companyId_normalizedName: { companyId, normalizedName: key } }, select: { id: true },
    });
    if (!existing) {
      const inactive = INACTIVE_NORMALIZED_KEYS.has(key);
      await prisma.logisticsDestination.create({
        data: { companyId, name: display, normalizedName: key, active: !inactive },
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
    const key = normalizeDestination(stripDeliveryTermSuffix(s.destination));
    const id = key ? byKey.get(key) : undefined;
    if (id) { await prisma.exportDocumentSet.update({ where: { id: s.id }, data: { destinationId: id } }); backfilled++; }
  }

  return { created, deactivated, backfilled };
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
