/**
 * Чист (без DB) мапинг на споделените полета за promote-to-source. Изнесен отделно, за да
 * е тестваем без Prisma. Виж promoteToSource.ts за оркестрацията (update + regenerate).
 */
import { Prisma } from "@prisma/client";
import { splitTruckTrailer } from "@/lib/logistics/exportDocs";

// Споделените полета, които могат да се promote-нат към ExportDocumentSet source-а.
export type PromotePatch = {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;        // ISO
  truck?: string | null;              // комбиниран „TRUCK / TRAILER" етикет
  destination?: string | null;
  product?: string | null;            // productSnapshot
  quantity?: number | null;
  declarationCmrDate?: string | null; // ISO
};

/** Превежда PromotePatch → колони на ExportDocumentSet (само подадените полета). */
export function promotePatchToSet(p: PromotePatch): Prisma.ExportDocumentSetUpdateInput {
  const data: Prisma.ExportDocumentSetUpdateInput = {};
  if (p.invoiceNumber !== undefined) data.invoiceNumber = (p.invoiceNumber ?? "").trim();
  if (p.invoiceDate !== undefined) data.invoiceDate = p.invoiceDate ? new Date(p.invoiceDate) : null;
  if (p.destination !== undefined) data.destination = p.destination;
  if (p.product !== undefined) data.productSnapshot = p.product;
  if (p.quantity !== undefined) data.quantity = p.quantity;
  if (p.declarationCmrDate !== undefined) data.declarationCmrDate = p.declarationCmrDate ? new Date(p.declarationCmrDate) : null;
  if (p.truck !== undefined) {
    const { truck, trailer } = splitTruckTrailer(p.truck);
    data.truckRegSnapshot = truck; data.trailerReg = trailer;
  }
  return data;
}
