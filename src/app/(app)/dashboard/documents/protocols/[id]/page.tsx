import { requirePaidPlan } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "@/components/app/PrintButton";

export default async function ProtocolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requirePaidPlan();
  const { id } = await params;
  const [p, company] = await Promise.all([
    prisma.handoverProtocol.findFirst({ where: { id, companyId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);
  if (!p) notFound();

  const Party = ({ title, name, eik, address, mol }: { title: string; name?: string | null; eik?: string | null; address?: string | null; mol?: string | null }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{title}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{name ?? "—"}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 }}>
        {eik && <div>ЕИК: {eik}</div>}
        {address && <div>{address}</div>}
        {mol && <div>МОЛ/Лице: {mol}</div>}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }} className="no-print">
        <Link href="/dashboard/documents/protocols" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Протоколи</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, margin: 0 }}>{p.number}</h1>
        <div style={{ marginLeft: "auto" }}><PrintButton /></div>
      </div>

      <div className="glass printable" style={{ borderRadius: 14, maxWidth: 800, padding: "40px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700 }}>ПРИЕМО-ПРЕДАВАТЕЛЕН ПРОТОКОЛ</div>
          <div className="num" style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>№ {p.number}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
            {p.place ? `${p.place}, ` : ""}{new Date(p.date).toLocaleDateString("bg-BG")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
          <Party title="ПРЕДАВА" name={company?.name} eik={company?.eik} address={[company?.address, company?.city].filter(Boolean).join(", ")} mol={company?.mol} />
          <Party title="ПРИЕМА" name={p.counterpartyName} eik={p.counterpartyEik} address={p.counterpartyAddress} mol={p.counterpartyMol} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ПРЕДМЕТ НА ПРЕДАВАНЕ</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{p.items ?? "—"}</div>
        </div>

        {p.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ЗАБЕЛЕЖКИ</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--ink-soft)" }}>{p.description}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 24, marginTop: 48 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 6, fontSize: 12.5 }}>Предал: {p.handedBy ?? "................"}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 6, fontSize: 12.5 }}>Приел: {p.receivedBy ?? "................"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
