"use client";
import { INVOICE_TEMPLATES, allowedTemplateCount, type PlanId } from "@/lib/constants";
import { TemplatePreview } from "@/components/app/TemplatePreview";

/**
 * Галерия с визуални миниатюри на шаблоните за фактури.
 * - Ако подадеш `selected`/`onSelect` → става избор (клик върху шаблон го избира).
 * - Бутон „Преглед“ отваря пълен преглед в нов таб.
 */
export function TemplateGallery({ plan, selected, onSelect, title = "Шаблони за фактури" }: {
  plan?: PlanId; selected?: string; onSelect?: (id: string) => void; title?: string;
}) {
  const limit = plan ? allowedTemplateCount(plan) : Infinity;
  const list = limit === Infinity ? INVOICE_TEMPLATES : INVOICE_TEMPLATES.slice(0, limit);

  return (
    <div className="glass panel" style={{ padding: "20px 24px", marginTop: 16 }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 4px" }}>{title}</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
        {onSelect ? "Изберете дизайн и вижте как ще изглежда документът." : "Прегледайте наличните дизайни за вашите документи."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
        {list.map((t) => {
          const active = selected === t.id;
          return (
            <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                type="button"
                onClick={() => onSelect?.(t.id)}
                style={{
                  border: active ? "2px solid var(--emerald)" : "1px solid var(--border)",
                  borderRadius: 10, padding: 8, background: active ? "var(--emerald-soft, rgba(15,138,106,.08))" : "#fff",
                  cursor: onSelect ? "pointer" : "default", textAlign: "center",
                }}
              >
                <TemplatePreview templateId={t.id} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{t.name}{active ? " ✓" : ""}</div>
              </button>
              <a href={`/dashboard/settings/preview?template=${t.id}`} target="_blank" rel="noreferrer"
                style={{ textAlign: "center", fontSize: 11.5, fontWeight: 600, color: "var(--navy)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", textDecoration: "none" }}>
                👁 Преглед
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
