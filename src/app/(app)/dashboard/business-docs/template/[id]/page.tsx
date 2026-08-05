import { requireCompany, getPlan } from "@/lib/session";
import { planHasFeature } from "@/lib/constants";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTemplate, canAccessTemplate, templateDataSource } from "@/lib/businessDocs/templates";
import { prisma } from "@/lib/prisma";
import { CreateDocButton } from "@/components/app/business-docs/CreateDocButton";
import { LockedScreen } from "@/components/app/business-docs/LockedScreen";

const COMPLEXITY: Record<string, { label: string; color: string }> = {
  easy: { label: "Лесен", color: "var(--emerald)" },
  medium: { label: "Среден", color: "var(--brass)" },
  detailed: { label: "Подробен", color: "var(--brick)" },
};

export default async function TemplateInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const plan = await getPlan(companyId);
  if (!planHasFeature(plan, "doc_templates")) return <LockedScreen />;

  const { id } = await params;
  const t = getTemplate(id);
  if (!t) notFound();
  const comp = await prisma.company.findUnique({ where: { id: companyId }, select: { eik: true } });
  if (!canAccessTemplate(t.id, comp?.eik ?? null)) notFound();
  const cx = COMPLEXITY[t.complexity];
  const source = templateDataSource(t);
  const SOURCE_LABEL: Record<string, string> = { client: "Клиент", employee: "Служител", supplier: "Доставчик", vehicle: "Автомобил", none: "Само фирмени данни" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <Link href={`/dashboard/business-docs/category/${t.categoryId}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t.categoryTitle}</Link>
      </div>

      <div className="glass panel" style={{ maxWidth: 720, padding: "30px 34px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 30 }}>{t.categoryIcon}</span>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: cx.color, background: "rgba(0,0,0,.04)", borderRadius: 12, padding: "3px 10px" }}>Сложност: {cx.label}</span>
          <span style={{ color: "var(--muted)" }}>⏱ {t.estMinutes}</span>
        </div>

        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 18 }}>{t.description}</p>

        <Section title="Кога се използва">{t.whenToUse}</Section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, margin: "18px 0" }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--emerald-dark)", letterSpacing: .5, marginBottom: 8, textTransform: "uppercase" }}>Попълва се автоматично</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
              {t.autoFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brass)", letterSpacing: .5, marginBottom: 8, textTransform: "uppercase" }}>Вие попълвате</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
              {t.userFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 18 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            Източник на данни: <strong style={{ color: "var(--ink-soft)" }}>{SOURCE_LABEL[source]}</strong>
          </div>
          <CreateDocButton templateId={t.id} dataSource={source} />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
            След създаване документът се попълва автоматично с данните на вашата фирма и се отваря в редактора за преглед и свободна редакция.
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", letterSpacing: .5, marginBottom: 4, textTransform: "uppercase" }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
