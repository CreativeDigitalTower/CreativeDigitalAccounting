import { requireCompany } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ClientCrm } from "@/components/app/ClientCrm";
import { getT } from "@/lib/i18n/server";

export default async function ClientDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireCompany();
  const { t } = await getT();
  const { id } = await params;
  const docLower = (type: string) => {
    const label = t(`clients.docLower.${type}`);
    return label === `clients.docLower.${type}` ? type : label;
  };

  const client = await prisma.client.findFirst({
    where: { id, companyId },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      documents: { include: { lines: true }, orderBy: { issueDate: "desc" } },
      contracts: true,
      projects: true,
      contacts: { orderBy: { isPrimary: "desc" } },
      tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
      files: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!client) notFound();

  const docTotal = (d: { lines: { lineTotal: number }[] }) => d.lines.reduce((s, l) => s + l.lineTotal, 0);
  const invoices = client.documents.filter((d) => d.type === "invoice");
  const totalInvoiced = invoices.reduce((s, d) => s + docTotal(d), 0);
  const paidTotal = invoices.filter((d) => d.status === "paid").reduce((s, d) => s + docTotal(d), 0);

  // ─── Хронология ───
  const timeline: { date: string; kind: string; label: string; icon: string; color: string }[] = [];
  timeline.push({ date: client.createdAt.toISOString(), kind: "added", label: t("clients.crm.timeline.added"), icon: "+", color: "var(--navy)" });
  for (const d of client.documents) {
    const label = t("clients.crm.timeline.issued", { doc: docLower(d.type), number: d.number });
    timeline.push({ date: d.issueDate.toISOString(), kind: d.type, label, icon: d.type === "quote" ? "✓" : "•", color: d.type === "quote" ? "var(--brass)" : "var(--navy)" });
    if (d.status === "paid") timeline.push({ date: d.issueDate.toISOString(), kind: "payment", label: t("clients.crm.timeline.payment", { number: d.number, amount: `${docTotal(d).toFixed(2)} €` }), icon: "€", color: "var(--emerald)" });
  }
  for (const c of client.contracts) timeline.push({ date: c.startDate.toISOString(), kind: "contract", label: t("clients.crm.timeline.contract", { title: c.title }), icon: "§", color: "var(--navy)" });
  for (const p of client.projects) timeline.push({ date: (p.deadline ?? client.createdAt).toISOString(), kind: "project", label: t("clients.crm.timeline.project", { name: p.name }), icon: "▣", color: "var(--brass)" });
  for (const task of client.tasks.filter((x) => x.done)) timeline.push({ date: task.createdAt.toISOString(), kind: "task", label: t("clients.crm.timeline.taskDone", { title: task.title }), icon: "✓", color: "var(--emerald)" });
  timeline.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <ClientCrm
      client={{
        id: client.id, name: client.name, eik: client.eik, vatNumber: client.vatNumber, address: client.address, city: client.city,
        mol: client.mol, contactPerson: client.contactPerson, contactEmail: client.contactEmail, phone: client.phone,
        status: client.status, stage: client.stage, dealValue: client.dealValue, birthday: client.birthday?.toISOString() ?? null,
        website: client.website, tags: client.tags,
        clientSince: client.clientSince?.toISOString() ?? null, openingRevenue: client.openingRevenue, monthlyRetainer: client.monthlyRetainer,
      }}
      totalInvoiced={totalInvoiced}
      paidTotal={paidTotal}
      documents={client.documents.map((d) => ({ id: d.id, type: d.type, number: d.number, issueDate: d.issueDate.toISOString(), total: docTotal(d), currency: d.currency, status: d.status }))}
      contracts={client.contracts.map((c) => ({ id: c.id, label: c.title }))}
      projects={client.projects.map((p) => ({ id: p.id, label: p.name }))}
      notes={client.notes.map((n) => ({ id: n.id, note: n.note, createdAt: n.createdAt.toISOString() }))}
      contacts={client.contacts.map((c) => ({ id: c.id, name: c.name, position: c.position, phone: c.phone, email: c.email }))}
      tasks={client.tasks.map((t) => ({ id: t.id, title: t.title, type: t.type, dueDate: t.dueDate?.toISOString() ?? null, done: t.done }))}
      files={client.files.map((f) => ({ id: f.id, name: f.name, size: f.size, uploadedAt: f.uploadedAt.toISOString() }))}
      timeline={timeline}
    />
  );
}
