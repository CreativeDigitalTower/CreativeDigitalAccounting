export type LegalSection = { h: string; p?: string[]; list?: string[] };

export function LegalDoc({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 32px 100px" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(28px,5vw,44px)", fontWeight: 700, margin: "0 0 8px" }}>
        {title}
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 36 }}>
        Последна актуализация: {new Date().toLocaleDateString("bg-BG")}
      </p>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, margin: "0 0 10px" }}>{s.h}</h2>
          {s.p?.map((para, j) => (
            <p key={j} style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>{para}</p>
          ))}
          {s.list && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 20, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.7 }}>
              {s.list.map((li, j) => <li key={j}>{li}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
