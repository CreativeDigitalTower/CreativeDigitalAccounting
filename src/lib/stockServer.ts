// Server-only: FIFO изписване по партиди. Чете партидите на артикула и връща
// масив от prisma update-и (намаляване на остатъка по най-старите партиди),
// готови за включване в $transaction. Ако артикулът НЯМА партиди → празен масив
// (артикулите без партидна отчетност не се влияят — без regression).
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { allocateFifo } from "@/lib/stock";

export async function consumeBatchesFifo(stockItemId: string, quantity: number): Promise<Prisma.PrismaPromise<unknown>[]> {
  const batches = await prisma.stockBatch.findMany({
    where: { stockItemId, quantity: { gt: 0 } },
    select: { id: true, quantity: true, createdAt: true, deliveryDate: true },
  });
  if (batches.length === 0) return [];
  const { allocations } = allocateFifo(batches, quantity);
  return allocations.map((a) =>
    prisma.stockBatch.update({ where: { id: a.batchId }, data: { quantity: { decrement: a.take } } })
  );
}
