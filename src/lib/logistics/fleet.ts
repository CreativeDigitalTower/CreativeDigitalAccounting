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
