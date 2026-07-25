"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

type Client = { id: string; name: string };

export function CreateDocButton({ templateId }: { templateId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");

  useEffect(() => { fetch("/api/clients").then((r) => r.json()).then((d) => setClients(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/business-docs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, clientId: clientId || null }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/dashboard/business-docs/doc/${id}`);
    } else { setBusy(false); setError((await res.json().catch(() => ({}))).error ?? t("bizdocs.create.err")); }
  }

  return (
    <div>
      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {clients.length > 0 && (
        <div style={{ marginBottom: 12, maxWidth: 320 }}>
          <label style={{ fontSize: 12.5 }}>{t("bizdocs.create.pickClient")}</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">{t("bizdocs.create.noClient")}</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <button onClick={create} disabled={busy} className="btn btn-primary" style={{ fontSize: 15, padding: "12px 30px" }}>
        {busy ? t("bizdocs.create.creating") : t("bizdocs.create.create")}
      </button>
    </div>
  );
}
