/**
 * Чиста логика за автопарка (влекач/ремарке, вид товар, капацитет) — без DB,
 * тестируемо изолирано. Ползва се от импорта, API-тата и UI-то.
 */
import { Prisma } from "@prisma/client";

const D = (v: number | string) => new Prisma.Decimal(v);

/** Вид на превозвания товар (§4). */
export const CARGO_MODES = ["bulk", "bags"] as const;
export type CargoMode = (typeof CARGO_MODES)[number];

/** Стандартна конфигурация за цимент в торби (§5). */
export const BAGS_DEFAULTS = { pallets: 17, bagsPerPallet: 56, kgPerBag: 25 };

/**
 * Изчислява товарната конфигурация за цимент в торби от броя палети (§5):
 *   торби   = палети × торби/палет
 *   тегло   = торби × kg/торба  →  тонове
 * Пример: 17 × 56 = 952 торби; 952 × 25 = 23 800 kg = 23.8 t.
 */
export function bagsCalc(pallets = BAGS_DEFAULTS.pallets, bagsPerPallet = BAGS_DEFAULTS.bagsPerPallet, kgPerBag = BAGS_DEFAULTS.kgPerBag) {
  const totalBags = pallets * bagsPerPallet;
  const totalKg = totalBags * kgPerBag;
  const palletKg = bagsPerPallet * kgPerBag;
  return {
    pallets, bagsPerPallet, kgPerBag, totalBags,
    kgPerPallet: palletKg,
    tonsPerPallet: D(palletKg).div(1000).toDecimalPlaces(3).toNumber(),
    totalKg,
    totalTons: D(totalKg).div(1000).toDecimalPlaces(3).toNumber(),
  };
}

/**
 * Проверка на капацитета при НАСИПЕН товар (§28): дали количеството надвишава
 * максималния товар. Връща null, ако няма зададен максимален товар (не изобретяваме).
 */
export function exceedsPayload(quantityTons: number, maxPayloadTons: number | null | undefined): boolean | null {
  if (maxPayloadTons == null) return null;
  return D(quantityTons).gt(maxPayloadTons);
}

/** Комбиниран етикет „ВЛЕКАЧ / РЕМАРКЕ" за визуализация (backend пази структурирано). */
export function truckTrailerDisplay(truck: string | null | undefined, trailer: string | null | undefined): string {
  return [truck, trailer].filter(Boolean).join(" / ");
}

/**
 * Избор на конфигурация за автомобил при създаване на доставка (§27): предпочита
 * конфигурация за избрания превозвач; иначе — първата налична. null, ако няма.
 */
export function pickVehicleConfig<T extends { carrierId: string | null }>(rows: T[], carrierId: string | null | undefined): T | null {
  if (!rows.length) return null;
  if (carrierId) { const match = rows.find((r) => r.carrierId === carrierId); if (match) return match; }
  return rows[0];
}

/** Полетата, които импортът оставя празни при неясни данни (§34). */
export type FleetGap = "driver" | "trailer" | "cargo" | "payload";

/** Минимален изглед на конфигурация за проверка на пълнотата. */
export type FleetRowLike = {
  defaultDriver?: string | null; driver?: string | null;
  trailer?: string | null; trailerReg?: string | null;
  cargoMode?: string | null;
  maxPayloadTons?: number | null;
};

/**
 * Кои полета липсват в една конфигурация (§34). Използва се от импорт-преглед екрана,
 * за да покаже точно какво трябва да допълни екипът на клиента. Нищо не се изобретява —
 * само се маркира празното.
 */
export function fleetGaps(row: FleetRowLike): FleetGap[] {
  const gaps: FleetGap[] = [];
  const driver = row.defaultDriver ?? row.driver ?? "";
  const trailer = row.trailer ?? row.trailerReg ?? "";
  if (!driver.trim()) gaps.push("driver");
  if (!trailer.trim()) gaps.push("trailer");
  if (!(row.cargoMode ?? "").trim()) gaps.push("cargo");
  if (row.maxPayloadTons == null) gaps.push("payload");
  return gaps;
}

/** Обобщение за импорт-преглед: брой конфигурации с всеки вид липса + напълно попълнени. */
export function fleetReviewSummary(rows: FleetRowLike[]) {
  const s = { total: rows.length, missingDriver: 0, missingTrailer: 0, missingCargo: 0, missingPayload: 0, incomplete: 0, complete: 0 };
  for (const r of rows) {
    const g = fleetGaps(r);
    if (g.includes("driver")) s.missingDriver++;
    if (g.includes("trailer")) s.missingTrailer++;
    if (g.includes("cargo")) s.missingCargo++;
    if (g.includes("payload")) s.missingPayload++;
    if (g.length) s.incomplete++; else s.complete++;
  }
  return s;
}

/**
 * Обединен изглед „Автопарк" (§2/§18): агрегира master Vehicle + неговите
 * VehicleConfiguration-и в един ред с primary config, брой конфигурации, липси и KPI.
 * Чиста логика (без DB), за да е тествана и споделена от API-то. НЕ трие и НЕ дублира
 * записи — само проекция.
 */
export type FleetVehicleInput = {
  id: string; registration: string; active: boolean;
  ownershipType: string | null; aliases: string[];
  configs: { id: string; trailer: string | null; carrierName: string | null; driver: string | null; driverPhone: string | null; cargoMode: string; maxPayloadTons: number | null; active: boolean }[];
};

export function buildFleetView(vehicles: FleetVehicleInput[], searchKey: (s: string) => string) {
  const kpi = { total: 0, active: 0, bulk: 0, bags: 0, missing: 0 };
  const rows = vehicles.map((v) => {
    const configs = v.configs.map((c) => ({ ...c, gaps: fleetGaps({ driver: c.driver, trailer: c.trailer, cargoMode: c.cargoMode, maxPayloadTons: c.maxPayloadTons }) }));
    const primary = configs.find((c) => c.active) ?? configs[0] ?? null;
    const anyGaps = configs.length === 0 || configs.some((c) => c.gaps.length > 0);
    kpi.total++;
    if (v.active) kpi.active++;
    for (const c of configs) { if (c.cargoMode === "bulk") kpi.bulk++; else if (c.cargoMode === "bags") kpi.bags++; }
    kpi.missing += configs.length === 0 ? 1 : configs.filter((c) => c.gaps.length > 0).length;
    return {
      id: v.id, registration: v.registration, active: v.active,
      ownershipType: v.ownershipType, aliases: v.aliases,
      trailer: primary?.trailer ?? null, carrierName: primary?.carrierName ?? null,
      driver: primary?.driver ?? null, driverPhone: primary?.driverPhone ?? null,
      cargoMode: primary?.cargoMode ?? "", maxPayloadTons: primary?.maxPayloadTons ?? null,
      configCount: configs.length, configs, anyGaps,
      _search: searchKey(v.registration + " " + v.aliases.join(" ")),
    };
  });
  return { kpi, rows };
}
