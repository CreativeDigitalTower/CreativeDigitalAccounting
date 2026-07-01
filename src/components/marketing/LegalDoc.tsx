export type LegalSection = { h: string; p?: string[]; list?: string[] };

function slug(s: string, i: number) {
  return "s" + i + "-" + s.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

export function LegalDoc({ title, sections, intro }: { title: string; sections: LegalSection[]; intro?: string }) {
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 24px 100px" }}>
      {/* Хедър */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Правна информация</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(28px,5vw,46px)", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-.5px" }}>{title}</h1>
        {intro && <p style={{ color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.6, maxWidth: 680, margin: "0 0 8px" }}>{intro}</p>}
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>Последна актуализация: {new Date().toLocaleDateString("bg-BG")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 240px", gap: 32, alignItems: "start" }} className="legal-grid">
        {/* Съдържание */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sections.map((s, i) => (
            <section key={i} id={slug(s.h, i)} className="glass panel" style={{ padding: "22px 26px", borderRadius: 14, scrollMarginTop: 90 }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, margin: "0 0 12px", display: "flex", gap: 12, alignItems: "baseline" }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: "var(--brass)", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{s.h}</span>
              </h2>
              {s.p?.map((para, j) => (
                <p key={j} style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.72, margin: "0 0 10px" }}>{para}</p>
              ))}
              {s.list && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 20, color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.7 }}>
                  {s.list.map((li, j) => <li key={j} style={{ marginBottom: 5 }}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* „На тази страница" навигация */}
        <nav className="legal-toc" style={{ position: "sticky", top: 24, fontSize: 12.5 }}>
          <div style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>На тази страница</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, borderLeft: "2px solid var(--border)", paddingLeft: 12 }}>
            {sections.map((s, i) => (
              <a key={i} href={`#${slug(s.h, i)}`} style={{ color: "var(--ink-soft)", textDecoration: "none", padding: "4px 0", lineHeight: 1.4 }}>
                {i + 1}. {s.h}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
