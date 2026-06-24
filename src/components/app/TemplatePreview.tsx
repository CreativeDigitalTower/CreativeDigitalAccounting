import { getTemplate } from "@/lib/constants";

/** Мини визуализация на това как изглежда фактурата с даден шаблон. */
export function TemplatePreview({ templateId, showLogo = false }: { templateId: string; showLogo?: boolean }) {
  const t = getTemplate(templateId);
  const accent = t.accent;
  const layout = t.layout as string;

  const line = (w: string, c = "#D9D7C8") => <div style={{ height: 4, width: w, background: c, borderRadius: 2 }} />;
  const brand = showLogo
    ? <div style={{ width: 30, height: 14, borderRadius: 3, background: accent, opacity: .85 }} />
    : <div style={{ fontSize: 8, fontWeight: 700, color: accent, fontFamily: "'Fraunces',serif" }}>ФИРМА</div>;
  const filledHead = layout === "band" || layout === "split" || layout === "boxed";

  let head: React.ReactNode;
  if (layout === "centered") {
    head = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {brand}
        <div style={{ fontSize: 9, fontWeight: 700, color: accent, letterSpacing: 1 }}>ФАКТУРА</div>
        {line("28px")}
        <div style={{ borderTop: `2px solid ${accent}`, width: 40, marginTop: 2 }} />
      </div>
    );
  } else if (layout === "boxed") {
    head = (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {brand}
          <div style={{ fontSize: 8, fontWeight: 700, color: accent }}>ФАКТУРА</div>
        </div>
        <div style={{ border: `1px solid ${accent}`, borderRadius: 3, padding: 4, display: "flex", flexDirection: "column", gap: 3 }}>{line("44px")}{line("32px")}</div>
      </>
    );
  } else if (layout === "minimal") {
    head = (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #E5E3D5", paddingBottom: 4 }}>
          <div style={{ fontSize: 8, fontWeight: 700 }}>ФИРМА</div>
          <div style={{ fontSize: 7, letterSpacing: 1, color: "#555" }}>ФАКТУРА</div>
        </div>
        {line("40px")}
      </div>
    );
  } else {
    // classic & band
    head = (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{brand}{line("44px")}{line("32px")}</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: accent }}>ФАКТУРА</div>
          {line("28px")}
        </div>
      </div>
    );
  }

  const inner = (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
      {layout === "split" ? (
        <div style={{ margin: "-10px -12px 0", padding: "10px 12px", background: accent, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#fff", fontFamily: "'Fraunces',serif" }}>ФИРМА</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>ФАКТУРА</div>
        </div>
      ) : head}
      <div style={{ height: 5, background: filledHead ? accent : "transparent", borderBottom: filledHead ? "none" : `2px solid ${accent}`, opacity: layout === "minimal" ? .4 : 1, borderRadius: filledHead ? 2 : 0, marginTop: 4 }} />
      {line("100%")}{line("90%")}{line("95%")}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ borderTop: `2px solid ${accent}`, width: "55%", paddingTop: 5 }} />
        <div style={{ height: 7, width: "45%", background: accent, borderRadius: 2 }} />
      </div>
    </div>
  );

  return (
    <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "1 / 1.3", display: "flex" }}>
      {layout === "leftrail" && <div style={{ width: 10, background: accent, flexShrink: 0 }} />}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, ...(layout === "band" ? {} : {}) }}>
        {layout === "band" && <div style={{ height: 8, background: accent }} />}
        {inner}
      </div>
    </div>
  );
}
