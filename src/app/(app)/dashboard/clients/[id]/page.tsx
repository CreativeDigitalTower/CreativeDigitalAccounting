import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Stamp } from "@/components/Stamp";
import { AddNote } from "@/components/app/AddNote";
import { ClientInfoCard } from "@/components/app/ClientInfoCard";
import { formatCurrency } from "@/lib/constants";

export default async function ClientDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, companyId },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      documents: { include: { lines: true }, orderBy: { createdAt: "desc" } },
      contracts: true,
      projects: true,
    },
  });
  if (!client) notFound();

  const totalInvoiced = client.documents
    .filter((d) => d.type === "invoice")
    .reduce((s, d) => s + d.lines.reduce((ss, l) => ss + l.lineTotal, 0), 0);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Клиенти</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{client.name}</h1>
        <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }}>+ Нов документ</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 18, alignItems: "start" }}>
        {/* Инфо */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <ClientInfoCard
            client={{
              id: client.id, name: client.name, eik: client.eik, vatNumber: client.vatNumber,
              mol: client.mol, contactPerson: client.contactPerson, city: client.city,
              address: client.address, contactEmail: client.contactEmail, phone: client.phone,
            }}
            totalInvoiced={totalInvoiced}
          />

          {/* CRM бележки */}
          <div className="glass panel">
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "0 0 4px" }}>CRM бележки</h3>
            <AddNote clientId={client.id} />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {client.notes.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Няма бележки.</div>
              ) : client.notes.map((n) => (
                <div key={n.id} style={{ fontSize: 13, padding: "8px 10px", background: "rgba(255,255,255,.5)", borderRadius: 6, border: "1px solid var(--border)" }}>
                  <div>{n.note}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString("bg-BG")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Документи + проекти + договори */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="glass panel" style={{ padding: "8px 0" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: "12px 16px" }}>Документи ({client.documents.length})</h3>
            {client.documents.length === 0 ? (
              <div style={{ padding: "8px 16px 16px", color: "var(--muted)", fontSize: 13 }}>Няма документи.</div>
            ) : (
              <table>
                <thead><tr><th style={{ paddingLeft: 16 }}>Номер</th><th>Дата</th><th className="num">Сума</th><th>Статус</th></tr></thead>
                <tbody>
                  {client.documents.map((d) => (
                    <tr key={d.id}>
                      <td style={{ paddingLeft: 16 }}><Link href={`/dashboard/documents/${d.id}`} style={{ color: "var(--navy)", textDecoration: "none", fontWeight: 600 }}>{d.number}</Link></td>
                      <td style={{ fontSize: 13, color: "var(--ink-soft)" }}>{new Date(d.issueDate).toLocaleDateString("bg-BG")}</td>
                      <td className="num">{formatCurrency(d.lines.reduce((s, l) => s + l.lineTotal, 0), d.currency)}</td>
                      <td><Stamp status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="glass panel">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 10px" }}>Договори ({client.contracts.length})</h3>
              {client.contracts.map((c) => <div key={c.id} style={{ fontSize: 13, padding: "4px 0" }}>{c.title}</div>)}
              {client.contracts.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div>}
            </div>
            <div className="glass panel">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 14, margin: "0 0 10px" }}>Проекти ({client.projects.length})</h3>
              {client.projects.map((p) => <div key={p.id} style={{ fontSize: 13, padding: "4px 0" }}>{p.name}</div>)}
              {client.projects.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>—</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
