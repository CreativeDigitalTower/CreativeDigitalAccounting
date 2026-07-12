import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { SupplierInfoCard } from "@/components/app/SupplierInfoCard";
import { getT } from "@/lib/i18n/server";

export default async function SupplierDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { t, locale } = await getT();
  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId },
    include: { expenses: { orderBy: { date: "desc" } }, contracts: true },
  });
  if (!supplier) notFound();

  const totalSpent = supplier.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/suppliers" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("suppliers.dossier.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{supplier.name}</h1>
        {supplier.rating && <span style={{ color: "var(--brass)" }}>{"★".repeat(supplier.rating)}{"☆".repeat(5 - supplier.rating)}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SupplierInfoCard supplier={{
            id: supplier.id, name: supplier.name, eik: supplier.eik, vatNumber: supplier.vatNumber,
            address: supplier.address, city: supplier.city, contactPerson: supplier.contactPerson,
            contactEmail: supplier.contactEmail, phone: supplier.phone, website: supplier.website,
            rating: supplier.rating, notes: supplier.notes,
          }} />
          <div className="glass panel">
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{t("suppliers.dossier.totalExpenses")}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(totalSpent)}</div>
          </div>
        </div>

        <div className="glass panel" style={{ padding: "8px 0" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>{t("suppliers.dossier.expenses", { n: supplier.expenses.length })}</h3>
          {supplier.expenses.length === 0 ? (
            <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>{t("suppliers.dossier.empty")}</div>
          ) : (
            <table>
              <thead><tr><th style={{ paddingLeft: 16 }}>{t("suppliers.dossier.th.description")}</th><th>{t("suppliers.dossier.th.date")}</th><th className="num">{t("suppliers.dossier.th.amount")}</th></tr></thead>
              <tbody>
                {supplier.expenses.map((e) => (
                  <tr key={e.id}>
                    <td style={{ paddingLeft: 16, fontWeight: 600 }}>{e.description}</td>
                    <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(e.date).toLocaleDateString(locale)}</td>
                    <td className="num">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
