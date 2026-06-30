import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/app/ProjectDetail";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("projects");
  const { id } = await params;

  const p = await prisma.project.findFirst({
    where: { id, companyId },
    include: {
      client: true,
      entries: { orderBy: { date: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      subProjects: { include: { entries: true }, orderBy: { createdAt: "desc" } },
      parentProject: { select: { id: true, name: true } },
    },
  });
  if (!p) notFound();

  const sum = (entries: { type: string; amount: number }[], t: string) =>
    entries.filter((e) => e.type === t).reduce((s, e) => s + e.amount, 0);

  return (
    <ProjectDetail
      project={{
        id: p.id, name: p.name, description: p.description, status: p.status,
        progressPercent: p.progressPercent, budget: p.budget,
        deadline: p.deadline?.toISOString() ?? null,
        clientName: p.client?.name ?? null,
        parent: p.parentProject ? { id: p.parentProject.id, name: p.parentProject.name } : null,
        revenue: sum(p.entries, "revenue"), expense: sum(p.entries, "expense"),
      }}
      entries={p.entries.map((e) => ({ id: e.id, type: e.type, amount: e.amount, description: e.description, date: e.date.toISOString() }))}
      notes={p.notes.map((n) => ({ id: n.id, note: n.note, author: n.author, createdAt: n.createdAt.toISOString() }))}
      subProjects={p.subProjects.map((s) => ({
        id: s.id, name: s.name, status: s.status, progressPercent: s.progressPercent,
        revenue: sum(s.entries, "revenue"), expense: sum(s.entries, "expense"),
      }))}
    />
  );
}
