/**
 * Идемпотентен, company-scoped import на MK клиентите на SEM INTERNATIONAL DOOEL (§7).
 * Ползва основния Client модел (CRM = Logistics, без дублиращ модел). Dedupe по ЕДБ,
 * иначе по нормализирано име. Не презаписва вече попълнени потребителски данни с празно.
 */
import { prisma } from "@/lib/prisma";
import { normalizeCompanyName } from "@/lib/logistics/normalize";
import { MK_CLIENTS } from "@/lib/logistics/mkClients.data";

export type MkClientImportResult = {
  created: number; updated: number; skipped: number; errors: string[];
  createdNames: string[]; updatedNames: string[];
};

export async function importMkClients(companyId: string): Promise<MkClientImportResult> {
  const res: MkClientImportResult = { created: 0, updated: 0, skipped: 0, errors: [], createdNames: [], updatedNames: [] };

  const existing = await prisma.client.findMany({
    where: { companyId },
    select: { id: true, name: true, eik: true, address: true, country: true },
  });
  const byEik = new Map<string, (typeof existing)[number]>();
  const byName = new Map<string, (typeof existing)[number]>();
  for (const c of existing) {
    if (c.eik) byEik.set(c.eik.trim(), c);
    byName.set(normalizeCompanyName(c.name), c);
  }

  for (const seed of MK_CLIENTS) {
    try {
      // Dedupe: първо по ЕДБ, иначе по нормализирано име (§7).
      const match = (seed.eik && byEik.get(seed.eik.trim())) || byName.get(normalizeCompanyName(seed.name)) || null;

      if (!match) {
        const c = await prisma.client.create({
          data: {
            companyId, name: seed.name, address: seed.address, eik: seed.eik, country: seed.country,
            status: "active",
          },
          select: { id: true, name: true, eik: true, address: true, country: true },
        });
        byName.set(normalizeCompanyName(c.name), c);
        if (c.eik) byEik.set(c.eik.trim(), c);
        res.created++; res.createdNames.push(seed.name);
        continue;
      }

      // Update само на липсващи полета — не изтриваме потребителски данни (§19).
      const data: Record<string, unknown> = {};
      if (!match.eik && seed.eik) data.eik = seed.eik;
      if (!(match.address ?? "").trim() && seed.address) data.address = seed.address;
      if (!(match.country ?? "").trim() && seed.country) data.country = seed.country;
      if (Object.keys(data).length === 0) { res.skipped++; continue; }
      await prisma.client.update({ where: { id: match.id }, data });
      res.updated++; res.updatedNames.push(seed.name);
    } catch (e) {
      res.errors.push(`${seed.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return res;
}
