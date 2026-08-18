/**
 * Транзакционен запис на движение на готова продукция — единствен път за промяна на
 * наличност/броячи. Не допуска отрицателна наличност (освен allowNegative).
 */
import { Prisma } from "@prisma/client";
import { fgMovementSpec, fgAvailableAfter, canReduceFg, type FgMovementType } from "@/lib/fashion/finishedGoods";

export class FgInsufficientError extends Error {
  constructor() { super("Недостатъчна наличност."); this.name = "FgInsufficientError"; }
}

export type FgMovementInput = {
  type: FgMovementType;
  direction?: "in" | "out"; // задължителна само за ADJUSTMENT
  quantity: number;
  unitCost?: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  userId?: string | null;
  note?: string | null;
};

/** Прилага движение върху FashionFinishedGood ред (в транзакция). */
export async function applyFgMovement(
  tx: Prisma.TransactionClient, companyId: string, finishedGoodId: string, input: FgMovementInput, allowNegative: boolean,
): Promise<void> {
  const fg = await tx.fashionFinishedGood.findFirst({ where: { id: finishedGoodId, companyId }, select: { id: true, available: true, unitCost: true, produced: true } });
  if (!fg) throw new Error("Готовата продукция не е намерена.");
  const spec = fgMovementSpec(input.type);
  const direction = spec.dir ?? input.direction;
  if (direction !== "in" && direction !== "out") throw new Error("Липсва посока.");
  if (!(input.quantity > 0)) throw new Error("Количеството трябва да е положително.");
  if (direction === "out" && !canReduceFg(fg.available, input.quantity, allowNegative)) throw new FgInsufficientError();

  const data: Record<string, unknown> = { available: fgAvailableAfter(fg.available, direction, input.quantity) };
  if (spec.counter) data[spec.counter] = { increment: input.quantity };
  // Себестойност при постъпване (среднопретеглена).
  if (input.type === "PRODUCTION_OUTPUT" && input.unitCost != null) {
    const total = fg.available + input.quantity;
    data.unitCost = total > 0 ? Math.round((fg.available * fg.unitCost + input.quantity * input.unitCost) / total * 10000) / 10000 : input.unitCost;
  }
  await tx.fashionFinishedGood.update({ where: { id: finishedGoodId }, data });
  await tx.fashionFinishedGoodMovement.create({
    data: {
      companyId, finishedGoodId, type: input.type, direction, quantity: input.quantity, unitCost: input.unitCost ?? null,
      sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null, userId: input.userId ?? null, note: input.note ?? null,
    },
  });
}

/** Намира (или създава) FG ред за style+color+size. */
export async function ensureFinishedGood(
  tx: Prisma.TransactionClient, companyId: string, styleId: string, color: string, size: string, sku: string,
): Promise<string> {
  const existing = await tx.fashionFinishedGood.findFirst({ where: { companyId, styleId, color, size }, select: { id: true } });
  if (existing) return existing.id;
  const created = await tx.fashionFinishedGood.create({ data: { companyId, styleId, color, size, sku } });
  return created.id;
}
