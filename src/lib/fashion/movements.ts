/**
 * Централен запис на складово движение за материал — единствен път за промяна на
 * наличност/среднопретеглена цена. Изпълнява се В ТРАНЗАКЦИЯ (подава се tx клиент),
 * за да няма двойно приспадане/добавяне и гонки. Не допуска отрицателна наличност
 * (освен изрично allowNegative).
 */
import { Prisma } from "@prisma/client";
import { weightedAverage, applyMovement, canConsume, movementDirection, type MovementType } from "@/lib/fashion/inventory";

export class InsufficientStockError extends Error {
  constructor(public materialId: string, public available: number, public requested: number) {
    super("Недостатъчна наличност.");
    this.name = "InsufficientStockError";
  }
}

export type MovementInput = {
  materialId: string;
  type: MovementType;
  direction?: "in" | "out"; // задължителна само за контекстуалните типове
  quantity: number;
  unit?: string;
  unitCost?: number | null; // за „in" движения → влиза в среднопретеглената
  sourceType?: string | null;
  sourceId?: string | null;
  userId?: string | null;
  note?: string | null;
  date?: Date;
};

/**
 * Записва движение и обновява материала атомарно. `tx` е Prisma транзакционен клиент.
 * Връща обновените наличност/цена. Хвърля InsufficientStockError при недостиг.
 */
export async function applyMaterialMovement(
  tx: Prisma.TransactionClient,
  companyId: string,
  input: MovementInput,
  allowNegative: boolean,
): Promise<{ quantity: number; avgCost: number; movementId: string }> {
  const material = await tx.fashionMaterial.findFirst({
    where: { id: input.materialId, companyId },
    select: { id: true, quantity: true, avgCost: true, unit: true },
  });
  if (!material) throw new Error("Материалът не е намерен.");

  const direction = input.direction ?? movementDirection(input.type);
  if (direction !== "in" && direction !== "out") throw new Error("Липсва посока на движението.");
  if (!(input.quantity > 0)) throw new Error("Количеството трябва да е положително.");

  if (direction === "out" && !canConsume(material.quantity, input.quantity, allowNegative)) {
    throw new InsufficientStockError(material.id, material.quantity, input.quantity);
  }

  const unit = input.unit ?? material.unit;
  const newQty = applyMovement(material.quantity, direction, input.quantity);
  // Среднопретеглената се преизчислява само при входящо количество с цена.
  const newAvg = direction === "in" && input.unitCost != null
    ? weightedAverage(material.quantity, material.avgCost, input.quantity, input.unitCost)
    : material.avgCost;

  await tx.fashionMaterial.update({
    where: { id: material.id },
    data: {
      quantity: newQty,
      avgCost: newAvg,
      ...(input.type === "PURCHASE" ? { lastDeliveryAt: input.date ?? new Date() } : {}),
    },
  });

  const mv = await tx.fashionInventoryMovement.create({
    data: {
      companyId, materialId: material.id, type: input.type, direction,
      quantity: input.quantity, unit, unitCost: input.unitCost ?? null,
      sourceType: input.sourceType ?? null, sourceId: input.sourceId ?? null,
      userId: input.userId ?? null, note: input.note ?? null, date: input.date ?? new Date(),
    },
    select: { id: true },
  });

  return { quantity: newQty, avgCost: newAvg, movementId: mv.id };
}
