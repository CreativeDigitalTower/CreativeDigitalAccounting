import { requireSuperAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SECTORS, COMPANY_SIZES, getSector, SECTOR_TITLE, SIZE_LABEL } from "@/lib/workspaces";
import { planLabel } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type SP = { sector?: string; category?: string; size?: string; country?: string; plan?: string; from?: string; to?: string };

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuperAdmin();
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
        <Link href="/dashboard/admin" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Супер Админ</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>Бизнеси</h1>
      </div>

      {/* Филтри */}
      <form className="glass panel" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, alignItems: "end" }}>
          <div><label style={{ fontSize: 11 }}>Сектор</label>
            <select name="sector" defaultValue={sp.sector ?? ""} style={inputStyle}><option value="">Всички</option>{SECTORS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>Подкатегория</label>
            <select name="category" defaultValue={sp.category ?? ""} style={inputStyle} disabled={!subs.length}><option value="">Всички</option>{subs.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>Размер</label>
            <select name="size" defaultValue={sp.size ?? ""} style={inputStyle}><option value="">Всички</option>{COMPANY_SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>План</label>
            <select name="plan" defaultValue={sp.plan ?? ""} style={inputStyle}><option value="">Всички</option>{["free", "start", "business", "pro"].map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11 }}>Държава</label><input name="country" defaultValue={sp.country ?? ""} style={inputStyle} placeholder="България" /></div>
          <div><label style={{ fontSize: 11 }}>Регистрация от</label><input type="date" name="from" defaultValue={sp.from ?? ""} style={inputStyle} /></div>
          <div><label style={{ fontSize: 11 }}>до</label><input type="date" name="to" defaultValue={sp.to ?? ""} style={inputStyle} /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" type="submit">Филтрирай</button>
            <Link href="/dashboard/admin/businesses" className="btn btn-ghost btn-sm">Изчисти</Link>
          </div>
        </div>
      </form>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>Намерени: <strong>{companies.length}</strong> фирми</div>

      <div className="glass panel" style={{ padding: "8px 0", overflowX: "auto" }}>
        <table>
          <thead><tr><th>Фирма</th><th>Сектор</th><th>Подкатегория</th><th>Размер</th><th>Държава</th><th>План</th><th>Регистрация</th></tr></thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ fontSize: 12.5 }}>{SECTOR_TITLE(c.businessSector)}</td>
                <td style={{ fontSize: 12.5 }}>{c.businessCategory ?? "—"}</td>
                <td style={{ fontSize: 12.5 }}>{SIZE_LABEL(c.companySize)}</td>
                <td style={{ fontSize: 12.5 }}>{c.country ?? "—"}</td>
                <td><span style={{ fontSize: 11.5, fontWeight: 700, color: (c.subscription?.plan ?? "free") === "free" ? "var(--muted)" : "var(--emerald-dark)" }}>{planLabel(c.subscription?.plan ?? "free")}</span></td>
                <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{new Date(c.createdAt).toLocaleDateString("bg-BG")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
