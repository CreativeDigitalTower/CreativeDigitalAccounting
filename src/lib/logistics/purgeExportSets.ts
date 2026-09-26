/**
 * Окончателно (hard) изтриване на експортни доставки от Кошчето (§1/§2). DESTRUCTIVE.
 *
 * Безопасност (наложена server-side, независимо от UI):
 *   - САМО доставки на текущата фирма (`companyId`) — tenant isolation (§11).
 *   - САМО такива, които вече са в Кошчето (`deletedAt != null`) — активна доставка НИКОГА
 *     не може да бъде hard-deleted (§12). Активни/чужди/несъществуващи id-та просто не са
 *     сред таргетите (без silent partial delete на валидните, §14).
 *   - Empty Trash = всички trashed на фирмата; НИКОГА deleteMany({}) без company+trash (§15).
 *   - Транзакционно: всичко или нищо (§10).
 *
 * Owned child записи се махат чрез Prisma onDelete: Cascade (ExportDocument, ExportAttachment).
 * Shared/бизнес записи се ЗАПАЗВАТ чрез onDelete: SetNull (MkInvoice, Document/фактури,
 * Shipment, LogisticsDestination) — само връзката се занулява (§9). Audit е company-scoped
 * (AuditLog няма FK към доставката) → преживява изтриването (§16).
 */
import type { PrismaClient } from "@prisma/client";
import { audit } from "@/lib/documents";

export type PurgeInput = { companyId: string; userId: string | null; ids?: string[]; emptyTrash?: boolean };
export type PurgeResult = { deleted: number; requested: number; invoiceNumbers: string[] };

export async function purgeExportSets(prisma: PrismaClient, input: PurgeInput): Promise<PurgeResult> {
  const { companyId, userId, ids, emptyTrash } = input;

  // Таргети: винаги ограничени до собствената фирма И вече в Кошчето.
  const where = emptyTrash
    ? { companyId, deletedAt: { not: null } }
    : { companyId, deletedAt: { not: null }, id: { in: ids ?? [] } };

  if (!emptyTrash && (!ids || ids.length === 0)) return { deleted: 0, requested: 0, invoiceNumbers: [] };

  const targets = await prisma.exportDocumentSet.findMany({ where, select: { id: true, invoiceNumber: true } });
  const requested = emptyTrash ? targets.length : (ids?.length ?? 0);
  if (targets.length === 0) return { deleted: 0, requested, invoiceNumbers: [] };

  // Атомарно: всички delete-ове в една транзакция (cascade/SetNull се прилагат от Prisma/DB).
  await prisma.$transaction(targets.map((t) => prisma.exportDocumentSet.delete({ where: { id: t.id } })));

  // Audit СЛЕД успешния commit (company-scoped, преживява изтриването). Best-effort.
  const kind = emptyTrash ? " (empty-trash)" : (ids && ids.length > 1 ? " (bulk)" : "");
  for (const t of targets) {
    await audit(companyId, userId, "permanent_delete", "ExportDocumentSet", t.id, `EXPORT_DELIVERY_PERMANENTLY_DELETED ${t.invoiceNumber}${kind}`);
  }

  return { deleted: targets.length, requested, invoiceNumbers: targets.map((t) => t.invoiceNumber) };
}
