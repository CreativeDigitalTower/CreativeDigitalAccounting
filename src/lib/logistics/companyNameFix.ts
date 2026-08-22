/**
 * Company-scoped корекция на грешно записаното име „SEM INTERNATIONAL DOOEL" (§6/§29).
 * Master данните на конкретната Logistics фирма/група се коригират — НЕ глобален
 * string replace за всички фирми. Идемпотентно; НЕ пипа финализирани snapshot-и.
 */
import { prisma } from "@/lib/prisma";
import { nameKey } from "@/lib/logistics/nameMatch";
import { SEM_CANON as CANON, isSemInternational } from "@/lib/logistics/semName";

export { isSemInternational };

/** Дали вече е каноничното име (за идемпотентност). */
function isCanonical(c: { name: string; nameEn: string | null; address: string | null; addressEn: string | null }): boolean {
  return c.name === CANON.name && c.nameEn === CANON.name && c.address === CANON.address && c.addressEn === CANON.address;
}

export type NameFixResult = {
  companiesFixed: { id: string; before: string; after: string }[];
  clientsFixed: { id: string; before: string; after: string }[];
  duplicates: { name: string; ids: string[] }[];
  scanned: number;
};

export async function fixSemInternationalNames(companyId: string): Promise<NameFixResult> {
  const res: NameFixResult = { companiesFixed: [], clientsFixed: [], duplicates: [], scanned: 0 };

  // Обхват: фирмите-купувачи по export set-овете на тази фирма (company-scoped).
  const sets = await prisma.exportDocumentSet.findMany({
    where: { companyId, buyerCompanyId: { not: null } },
    select: { buyerCompanyId: true },
  });
  const buyerIds = [...new Set(sets.map((s) => s.buyerCompanyId).filter((x): x is string => !!x))];

  if (buyerIds.length) {
    const companies = await prisma.company.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, name: true, nameEn: true, address: true, addressEn: true, city: true, cityEn: true, country: true, countryEn: true },
    });
    res.scanned += companies.length;
    const bySig = new Map<string, string[]>();
    for (const c of companies) {
      if (!isSemInternational(c.name) && !isSemInternational(c.nameEn)) continue;
      const sig = nameKey(c.nameEn || c.name);
      bySig.set(sig, [...(bySig.get(sig) ?? []), c.id]);
      if (isCanonical(c)) continue;
      await prisma.company.update({
        where: { id: c.id },
        data: {
          name: CANON.name, nameEn: CANON.name,
          address: CANON.address, addressEn: CANON.address,
          city: CANON.city, cityEn: CANON.city,
          country: c.country ?? CANON.country, countryEn: CANON.country,
        },
      });
      res.companiesFixed.push({ id: c.id, before: c.nameEn || c.name, after: CANON.name });
    }
    // Дубликати (една и съща фирма записана няколко пъти).
    for (const [, ids] of bySig) if (ids.length > 1) res.duplicates.push({ name: CANON.name, ids });
  }

  // Logistics клиенти на тази фирма.
  const clients = await prisma.client.findMany({ where: { companyId }, select: { id: true, name: true, address: true, city: true } });
  res.scanned += clients.length;
  for (const cl of clients) {
    if (!isSemInternational(cl.name)) continue;
    if (cl.name === CANON.name && cl.address === CANON.address && cl.city === CANON.city) continue;
    await prisma.client.update({ where: { id: cl.id }, data: { name: CANON.name, address: CANON.address, city: CANON.city } });
    res.clientsFixed.push({ id: cl.id, before: cl.name, after: CANON.name });
  }

  return res;
}
