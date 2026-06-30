import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/constants";
import { ClientPipeline } from "@/components/app/ClientPipeline";
import { STATUSES } from "@/components/app/ClientCrm";

export default async function ClientsPage(props: { searchParams: Promise<{ view?: string }> }) {
  try {
    return await ClientsPageInner(props);
  } catch (e) {
    const err = e as Error;
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600 }}>Клиенти (CRM) — диагностика</h1>
        <p style={{ color: "var(--brick)", fontSize: 13 }}>Възникна грешка при зареждане. Техническа информация:</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#1e1e1e", color: "#f88", padding: 16, borderRadius: 8, overflow: "auto" }}>
{String(err?.name)}: {String(err?.message)}
{"\n"}{String((err as { code?: string })?.code ?? "")}
{"\n"}{String(err?.stack ?? "").slice(0, 2000)}
        </pre>
      </div>
    );
  }
}

async function ClientsPageInner({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
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
  const grandTotal = [...totalByClient.values()].reduce((s, v) => s + v, 0);
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
      <>
      {/* Общо приходи */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="glass panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Общ приход от всички клиенти (този месец)</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald-dark)" }}>{formatCurrency(grandMonth)}</div>
        </div>
        <div className="glass panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Общ приход от всички клиенти (общо)</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)" }}>{formatCurrency(grandTotal)}</div>
        </div>
      </div>

      <div className="glass panel" style={{ padding: "8px 0" }}>
        {clients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>Няма клиенти</div>
            <Link href="/dashboard/clients/new" className="btn btn-primary btn-sm">Добави клиент</Link>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Статус</th>
                <th>Телефон</th>
                <th className="num">Приход (месец)</th>
                <th className="num">Приход (общо)</th>
                <th className="num">Задачи</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => (
                <tr key={client.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy-soft)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{client.name}</div>
                        {client.contactPerson && <div style={{ fontSize: 12, color: "var(--muted)" }}>{client.contactPerson}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{(() => { const s = STATUSES.find((x) => x.id === client.status) ?? STATUSES[1]; return <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: s.color, borderRadius: 14, padding: "2px 9px" }}>{s.label}</span>; })()}</td>
                  <td style={{ fontSize: 13 }}>{client.phone ?? "—"}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{formatCurrency(monthByClient.get(client.id) ?? 0)}</td>
                  <td className="num" style={{ fontWeight: 600, color: "var(--emerald-dark)" }}>{formatCurrency(totalByClient.get(client.id) ?? 0)}</td>
                  <td className="num">{(openTasksByClient.get(client.id) ?? 0) > 0 ? <span style={{ color: "var(--brass)", fontWeight: 700 }}>{openTasksByClient.get(client.id)}</span> : "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <Link href={`/dashboard/clients/${client.id}`} className="btn btn-ghost btn-sm">Досие</Link>
                    <Link href={`/dashboard/clients/${client.id}?edit=1`} className="btn btn-ghost btn-sm">✎ Редактирай</Link>
                    <Link href={`/dashboard/documents/new?clientId=${client.id}`} className="btn btn-primary btn-sm">+ Фактура</Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right" }}>Общо:</td>
                <td className="num">{formatCurrency(grandMonth)}</td>
                <td className="num" style={{ color: "var(--emerald-dark)" }}>{formatCurrency(grandTotal)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>
        Приходите се изчисляват автоматично на база издадените фактури. Сортирано по общ приход (топ клиенти най-горе).
      </p>
      </>
      )}
    </>
  );
}
