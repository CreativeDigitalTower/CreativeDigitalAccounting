import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SECTORS, COMPANY_SIZES, getSector } from "@/lib/workspaces";
import { planLabel } from "@/lib/constants";
import type { Prisma } from "@prisma/client";
import { getT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

type SP = { sector?: string; category?: string; size?: string; country?: string; plan?: string; from?: string; to?: string };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuperAdmin();
  const { t, locale } = await getT();
  const secName = (id: string | null) => { if (!id) return "—"; const l = t(`sectors.sector.${id}`); return l.startsWith("sectors.") ? id : l; };
  const sizeName = (id: string | null) => { if (!id) return "—"; const l = t(`sectors.size.${id}`); return l.startsWith("sectors.") ? id : l; };
  const subLabels = (id: string | undefined): string[] => id ? ((getMessages(locale).sectors as unknown as { subcat: Record<string, string[]> }).subcat[id] ?? []) : [];
  const sp = await searchParams;

  const where: Prisma.CompanyWhereInput = {};
  if (sp.sector) where.businessSector = sp.sector;
  if (sp.category) where.businessCategory = sp.category;
  if (sp.size) where.companySize = sp.size;
  if (sp.country) where.country = { contains: sp.country, mode: "insensitive" };
  if (sp.plan) where.subscription = { plan: sp.plan as Prisma.SubscriptionWhereInput["plan"] };
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(sp.from);
    if (sp.to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(sp.to + "T23:59:59");
  }

  const companies = await prisma.company.findMany({
    where, include: { subscription: true, _count: { select: { companyUsers: true } } },
    orderBy: { createdAt: "desc" },
  });

  const subs = getSector(sp.sector)?.subcategories ?? [];
  const inputStyle = { padding: "7px 9px", fontSize: 12.5 };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("admin.backToAdmin")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>{t("admin.businesses.title")}</h1>
      </div>

      {/* Филтри */}
      <form className="glass panel" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, alignItems: "end" }}>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fSector")}</label>
            <select name="sector" defaultValue={sp.sector ?? ""} style={inputStyle}><option value="">{t("admin.businesses.all")}</option>{SECTORS.map((s) => <option key={s.id} value={s.id}>{t(`sectors.sector.${s.id}`)}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fCategory")}</label>
            <select name="category" defaultValue={sp.category ?? ""} style={inputStyle} disabled={!subs.length}><option value="">{t("admin.businesses.all")}</option>{subs.map((c, i) => <option key={c} value={c}>{subLabels(sp.sector)[i] ?? c}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fSize")}</label>
            <select name="size" defaultValue={sp.size ?? ""} style={inputStyle}><option value="">{t("admin.businesses.all")}</option>{COMPANY_SIZES.map((s) => <option key={s.id} value={s.id}>{t(`sectors.size.${s.id}`)}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fPlan")}</label>
            <select name="plan" defaultValue={sp.plan ?? ""} style={inputStyle}><option value="">{t("admin.businesses.all")}</option>{["free", "start", "business", "pro"].map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fCountry")}</label><input name="country" defaultValue={sp.country ?? ""} style={inputStyle} placeholder={t("admin.businesses.countryPh")} /></div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fFrom")}</label><input type="date" name="from" defaultValue={sp.from ?? ""} style={inputStyle} /></div>
          <div><label style={{ fontSize: 11 }}>{t("admin.businesses.fTo")}</label><input type="date" name="to" defaultValue={sp.to ?? ""} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" type="submit">{t("admin.businesses.filter")}</button>
            <Link href="/dashboard/admin/businesses" className="btn btn-ghost btn-sm">{t("admin.businesses.clear")}</Link>
          </div>
        </div>
      </form>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{t("admin.businesses.found")} <strong>{companies.length}</strong> {t("admin.businesses.foundSuffix")}</div>

      <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto" }}>
        <table>
          <thead><tr><th>{t("admin.businesses.thCompany")}</th><th>{t("admin.businesses.thSector")}</th><th>{t("admin.businesses.thCategory")}</th><th>{t("admin.businesses.thSize")}</th><th>{t("admin.businesses.thCountry")}</th><th>{t("admin.businesses.thPlan")}</th><th>{t("admin.businesses.thRegistration")}</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ fontSize: 12.5 }}>{secName(c.businessSector)}</td>
                <td style={{ fontSize: 12.5 }}>{c.businessCategory ?? t("admin.businesses.dash")}</td>
                <td style={{ fontSize: 12.5 }}>{sizeName(c.companySize)}</td>
                <td style={{ fontSize: 12.5 }}>{c.country ?? t("admin.businesses.dash")}</td>
                <td><span style={{ fontSize: 11.5, fontWeight: 700, color: (c.subscription?.plan ?? "free") === "free" ? "var(--muted)" : "var(--emerald-dark)" }}>{planLabel(c.subscription?.plan ?? "free")}</span></td>
                <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(c.createdAt).toLocaleDateString(locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
