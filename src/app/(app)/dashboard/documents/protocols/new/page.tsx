import { requirePaidPlan } from "@/lib/session";
import Link from "next/link";
import { ProtocolForm } from "@/components/app/ProtocolForm";
import { DddProtocolForm } from "@/components/app/DddProtocolForm";
import { getT } from "@/lib/i18n/server";

export default async function NewProtocolPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requirePaidPlan(); // протоколите са само за платени абонаменти
  const { kind } = await searchParams;
  const { t } = await getT();

  if (kind === "handover") return <ProtocolForm />;
  if (kind === "ddd") return <DddProtocolForm />;

  // Избор на шаблон
  const cards = [
    { kind: "handover", title: t("subdocs.prot.pick.handover"), desc: t("subdocs.prot.pick.handoverDesc") },
    { kind: "ddd", title: t("subdocs.prot.pick.ddd"), desc: t("subdocs.prot.pick.dddDesc") },
  ];
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/documents/protocols" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("subdocs.prot.form.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("subdocs.prot.pick.title")}</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <Link key={c.kind} href={`/dashboard/documents/protocols/new?kind=${c.kind}`} className="glass panel" style={{ padding: "22px 24px", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--emerald-dark)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 12h6M9 15.5h6"/></svg>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 6px", textAlign: "center" }}>{c.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, textAlign: "center" }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
