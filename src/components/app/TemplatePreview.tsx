import { getTemplate } from "@/lib/constants";

/** Мини визуализация на това как изглежда фактурата с даден шаблон. */
export function TemplatePreview({ templateId, showLogo = false }: { templateId: string; showLogo?: boolean }) {
  const t = getTemplate(templateId);
  const accent = t.accent;
  const band = t.layout === "band";
  const minimal = t.layout === "minimal";

  const line = (w: string, c = "#D9D7C8") => (
    <div style={{ height: 4, width: w, background: c, borderRadius: 2 }} />
  );

  return (
    <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "1 / 1.3", display: "flex", flexDirection: "column" }}>
      {band && <div style={{ height: 8, background: accent }} />}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {showLogo
              ? <div style={{ width: 30, height: 14, borderRadius: 3, background: accent, opacity: .85 }} />
              : <div style={{ fontSize: 8, fontWeight: 700, color: accent, fontFamily: "'Fraunces',serif" }}>ФИРМА</div>}
            {line("44px")}
            {line("32px")}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: minimal ? "var(--ink)" : accent, letterSpacing: .5 }}>ФАКТУРА</div>
            {line("28px")}
          </div>
        </div>
        {/* table head */}
        <div style={{ height: 5, background: minimal ? "var(--ink)" : accent, opacity: minimal ? .15 : .9, borderRadius: 2, marginTop: 4 }} />
        {/* rows */}
        {line("100%")}{line("90%")}{line("95%")}
        {/* total */}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ borderTop: `2px solid ${accent}`, width: "55%", paddingTop: 5 }} />
          <div style={{ height: 7, width: "45%", background: accent, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
