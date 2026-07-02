import Link from "next/link";

export function LockedScreen() {
  const perks = [
    "Над 130 готови бизнес шаблона в 24 категории",
    "Автоматично попълване с данните на вашата фирма",
    "Професионален редактор с пълна свобода за промени",
    "Изтегляне като PDF, DOCX и версия за печат",
    "Запазване, статуси, любими и история на документите",
  ];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "20px 0" }}>
      <div style={{ display:"flex",justifyContent:"center",marginBottom: 8, color:"var(--muted)" }}><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z"/><path d="M14 2.5v4h4M9 12h6M9 15.5h6"/></svg></div>
      <span style={{ display: "inline-block", background: "var(--brass-soft)", color: "var(--brass)", border: "1px solid var(--brass)", borderRadius: 20, padding: "4px 14px", fontSize: 11.5, fontWeight: 700, marginBottom: 14 }}>
        ПЛАНОВЕ БИЗНЕС И ПРО
      </span>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: "0 0 12px" }}>
        Център за бизнес документи
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6, maxWidth: 560, margin: "0 auto 22px" }}>
        Създавайте професионални договори, заповеди, пълномощни, протоколи, декларации и десетки други
        фирмени документи за секунди — попълнени автоматично с данните на вашата фирма.
      </p>
      <div className="glass panel" style={{ padding: "20px 24px", maxWidth: 460, margin: "0 auto 22px", textAlign: "left" }}>
        {perks.map((p) => (
          <div key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", fontSize: 13.5 }}>
            <span style={{ color: "var(--emerald)", fontWeight: 700 }}>✓</span><span>{p}</span>
          </div>
        ))}
      </div>
      <Link href="/dashboard/subscription" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 30px" }}>
        Премини към Бизнес или Про →
      </Link>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>Отключете модула и още десетки функции за управление на целия си бизнес.</p>
    </div>
  );
}
