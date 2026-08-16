/**
 * Promote-to-source: пренася споделено бизнес поле, редактирано в конкретен документ,
 * към централния ExportDocumentSet (source-of-truth) и обновява само eligible downstream
 * draft документите. Еднопосочно (document → source → downstream), без хаотичен sync.
 *
 * Разграничение:
 *   A) SHARED BUSINESS FIELD → update на set-а + регенериране на unmodified draft-ове.
 *   B) DOCUMENT-ONLY OVERRIDE → остава само в конкретния ExportDocument (не се promote-ва).
 *
 * Защита: текущият документ вече е записан като overridden ПРЕДИ promote, затова се пропуска
 * при регенерирането. Finalized/overridden downstream документи не се презаписват тихо.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { regenerateSetDocuments, type GenerateResult } from "@/lib/logistics/exportGenerate";
import { promotePatchToSet, type PromotePatch } from "@/lib/logistics/promoteFields";

export { promotePatchToSet };
export type { PromotePatch };

export type PromoteResult = { ok: true; regenerate: GenerateResult } | { ok: false; error: string; status: number };

export async function promoteToSource(companyId: string, setId: string, actorId: string | null, patch: PromotePatch): Promise<PromoteResult> {
  const set = await prisma.exportDocumentSet.findFirst({ where: { id: setId, companyId }, select: { id: true } });
  if (!set) return { ok: false, error: "Не е намерена.", status: 404 };

  const update = promotePatchToSet(patch);
  if (Object.keys(update).length) {
    try {
      await prisma.exportDocumentSet.update({ where: { id: setId }, data: update });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { ok: false, error: "Фактура с този номер вече съществува.", status: 409 };
      }
      throw err;
    }
  }
  // Обновяваме само eligible downstream draft документи (finalized/overridden се пазят).
  const regenerate = await regenerateSetDocuments(companyId, setId, actorId, { force: false });
  return { ok: true, regenerate: regenerate ?? { generated: [], skipped: [] } };
}
