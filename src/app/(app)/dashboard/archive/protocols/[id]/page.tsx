import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProtocolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireFeature("archive");
  const { id } = await params;
  const p = await prisma.handoverProtocol.findFirst({ where: { id, companyId } });
  if (!p) notFound();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Link href="/dashboard/archive" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Архив</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Протокол {p.number}</h1>
      </div>
      <div className="glass panel" style={{ maxWidth: 600 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Дата: {new Date(p.date).toLocaleDateString("bg-BG")}</div>
        <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.description ?? "Без описание."}</p>
      </div>
    </>
  );
}
