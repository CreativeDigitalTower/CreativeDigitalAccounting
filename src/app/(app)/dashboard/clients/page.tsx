import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ClientPipeline } from "@/components/app/ClientPipeline";
import { ClientsList } from "@/components/app/ClientsList";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { companyId } = await requireCompany();
  const view = (await searchParams).view === "pipeline" ? "pipeline" : "list";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, invoices] = await Promise.all([
    prisma.client.findMany({
      where: { companyId },
      // filtered include (GA) за отворените задачи — без filtered _count / groupBy
      include: {
        _count: { select: { documents: true, notes: true } },
        tasks: { where: { done: false }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { companyId, type: "invoice", clientId: { not: null } },
      select: { clientId: true, issueDate: true, lines: { select: { lineTotal: true } } },
    }),
  ]);
  const openTasksByClient = new Map(clients.map((c) => [c.id, c.tasks.length]));

  // Приходи на база генерираните фактури
  const totalByClient = new Map<string, number>();
  const monthByClient = new Map<string, number>();
  for (const inv of invoices) {
    const sum = inv.lines.reduce((s, l) => s + l.lineTotal, 0);
    totalByClient.set(inv.clientId!, (totalByClient.get(inv.clientId!) ?? 0) + sum);
    if (new Date(inv.issueDate) >= monthStart) {
      monthByClient.set(inv.clientId!, (monthByClient.get(inv.clientId!) ?? 0) + sum);
    }
  }
  const grandTotal = [...totalByClient.values()].reduce((s, v) => s + v, 0) + clients.reduce((s, c) => s + (c.openingRevenue ?? 0), 0);
  const grandMonth = [...monthByClient.values()].reduce((s, v) => s + v, 0);

  const sorted = [...clients].sort((a, b) => (totalByClient.get(b.id) ?? 0) - (totalByClient.get(a.id) ?? 0));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 600, margin: "0 0 3px" }}>Клиенти (CRM)</h1>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>{clients.length} клиента</div>
        </div>
        <Link href="/dashboard/clients/new" className="btn btn-primary">+ Нов клиент</Link>
      </div>

      {/* Изглед: списък / pipeline */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <Link href="/dashboard/clients" className={`filter-tab${view === "list" ? " active" : ""}`}>Списък</Link>
        <Link href="/dashboard/clients?view=pipeline" className={`filter-tab${view === "pipeline" ? " active" : ""}`}>Pipeline (фуния)</Link>
      </div>

      {view === "pipeline" ? (
        <ClientPipeline initial={sorted.map((c) => ({ id: c.id, name: c.name, stage: c.stage, dealValue: c.dealValue, total: totalByClient.get(c.id) ?? 0 }))} />
      ) : (
        <ClientsList
          grandMonth={grandMonth}
          grandTotal={grandTotal}
          clients={sorted.map((c) => ({
            id: c.id, name: c.name, contactPerson: c.contactPerson, phone: c.phone, status: c.status,
            month: monthByClient.get(c.id) ?? 0, total: (totalByClient.get(c.id) ?? 0) + (c.openingRevenue ?? 0), openTasks: openTasksByClient.get(c.id) ?? 0,
          }))}
        />
      )}
    </>
  );
}
