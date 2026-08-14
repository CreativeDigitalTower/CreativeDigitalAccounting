/**
 * Concurrency-safe последователна номерация (корекции 8, 9).
 *
 * Използва ЕДНО атомарно Postgres изявление `INSERT … ON CONFLICT DO UPDATE …
 * RETURNING`, което инкрементира брояча на ниво база под unique constraint
 * ([companyId, scope, series, year]). Двама едновременни потребители НИКОГА не
 * получават един и същ номер — няма read-modify-write гонка на приложно ниво.
 *
 * Универсално: ползва се и за Shipment ID, и за фактурните номера (BG→MK, MK),
 * когато съответните phases ги въведат. Не пипа съществуващия generateDocumentNumber.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Клиент или транзакционен клиент — за да може извикващият да го включи в $transaction.
type Db = typeof prisma | Prisma.TransactionClient;

/** Генерира уникален id за raw INSERT (колоната е обикновен String @id). */
function genId(): string {
  // randomUUID е уникален и стабилен; форматът на @id String е без значение.
  return "seq_" + globalThis.crypto.randomUUID();
}

/**
 * Връща следващия номер (цяло число) за дадения scope, атомарно.
 * @param db  prisma или tx клиент (за включване в обхващаща транзакция).
 */
export async function nextSequenceValue(
  db: Db,
  companyId: string,
  scope: string,
  opts: { series?: string; year?: number } = {}
): Promise<number> {
  const series = opts.series ?? "";
  const year = opts.year ?? 0;
  const id = genId();

  const rows = await db.$queryRaw<{ nextValue: number }[]>(Prisma.sql`
    INSERT INTO "NumberSequence" ("id", "companyId", "scope", "series", "year", "nextValue", "updatedAt")
    VALUES (${id}, ${companyId}, ${scope}, ${series}, ${year}, 2, now())
    ON CONFLICT ("companyId", "scope", "series", "year")
    DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1, "updatedAt" = now()
    RETURNING "nextValue"
  `);
  // RETURNING връща стойността СЛЕД инкремента → присвоеният номер е с 1 по-малко.
  // При първи INSERT nextValue=2 → присвоен 1.
  return Number(rows[0].nextValue) - 1;
}
