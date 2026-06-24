"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  { id: "free", label: "Безплатен" },
  { id: "start", label: "Старт" },
  { id: "business", label: "Бизнес" },
  { id: "pro", label: "Про" },
];

type Props = {
  id: string;
  name: string;
  eik: string | null;
  plan: string;
  status: string;
  users: number;
  docs: number;
  createdAt: string;
  owners: string;
  details: {
    vatNumber: string | null; address: string | null; city: string | null;
    mol: string | null; sector: string | null; phone: string | null; email: string | null;
  };
  members: {
    name: string | null; email: string; representativeRole: string | null;
    marketingConsent: boolean; termsAcceptedAt: string | null; createdAt: string;
  }[];
};

export function AdminCompanyRow(props: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(props.plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function changePlan(next: string) {
    setSaving(true);
    setSaved(false);
    setPlan(next);
    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id, plan: next }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function impersonate() {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: props.id }),
    });
    if (res.ok) window.location.href = "/dashboard";
  }

  const d = props.details;
  const info: [string, string | null][] = [
    ["ДДС №", d.vatNumber], ["Сектор", d.sector], ["Град", d.city],
    ["Адрес", d.address], ["МОЛ", d.mol], ["Телефон", d.phone], ["Имейл (фирма)", d.email],
  ];

  return (
    <>
      <tr>
        <td>
          <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{open ? "▼" : "▶"}</span>
            <span>
              <span style={{ fontWeight: 600, fontSize: 13.5, display: "block" }}>{props.name}</span>
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{props.owners}</span>
            </span>
          </button>
        </td>
        <td className="num" style={{ fontSize: 12.5, color: "var(--muted)" }}>{props.eik ?? "—"}</td>
        <td className="num">{props.users}</td>
        <td className="num">{props.docs}</td>
        <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{props.createdAt}</td>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select value={plan} onChange={(e) => changePlan(e.target.value)} disabled={saving} style={{ width: "auto", padding: "5px 8px", fontSize: 12.5 }}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {saved && <span style={{ color: "var(--emerald)", fontSize: 12 }}>✓</span>}
          </div>
        </td>
        <td>
          <button onClick={impersonate} className="btn btn-ghost btn-sm">Влез в акаунта →</button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ background: "rgba(0,0,0,.02)", padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>ДАННИ НА ФИРМАТА</div>
                <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 12px", fontSize: 12.5 }}>
                  {info.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt style={{ color: "var(--muted)" }}>{k}</dt>
                      <dd style={{ margin: 0, fontWeight: 500 }}>{v}</dd>
                    </div>
                  ))}
                  {info.every(([, v]) => !v) && <span style={{ color: "var(--muted)" }}>Няма допълнителни данни.</span>}
                </dl>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brass)", letterSpacing: 1, marginBottom: 8 }}>РЕГИСТРИРАНИ ПОТРЕБИТЕЛИ</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {props.members.map((m, i) => (
                    <div key={i} style={{ fontSize: 12.5, borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>
                      <div style={{ fontWeight: 600 }}>{m.name ?? "—"} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({m.email})</span></div>
                      <div style={{ color: "var(--ink-soft)" }}>Качество: {m.representativeRole ?? "—"}</div>
                      <div style={{ color: "var(--ink-soft)" }}>
                        Маркетинг съгласие: {m.marketingConsent ? "✓ Да" : "Не"} ·
                        Условия приети: {m.termsAcceptedAt ? new Date(m.termsAcceptedAt).toLocaleDateString("bg-BG") : "—"}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Регистриран: {new Date(m.createdAt).toLocaleString("bg-BG")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
