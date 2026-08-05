"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import type { DataSource } from "@/lib/businessDocs/templates";

type Entity = { id: string; name: string };

// Всеки шаблон „знае" източника си (dataSource): HR → Служител, доставчици →
// Доставчик, клиенти/протоколи → Клиент, а фирмени/декларации → без контрагент.
const SOURCE_CFG: Record<Exclude<DataSource, "none">, { endpoint: string; labelKey: string; noneKey: string }> = {
  client: { endpoint: "/api/clients", labelKey: "bizdocs.create.pickClient", noneKey: "bizdocs.create.noClient" },
  employee: { endpoint: "/api/employees", labelKey: "bizdocs.create.pickEmployee", noneKey: "bizdocs.create.noEmployee" },
  supplier: { endpoint: "/api/suppliers", labelKey: "bizdocs.create.pickSupplier", noneKey: "bizdocs.create.noSupplier" },
  vehicle: { endpoint: "/api/vehicles", labelKey: "bizdocs.create.pickVehicle", noneKey: "bizdocs.create.noVehicle" },
};

export function CreateDocButton({ templateId, dataSource = "client" }: { templateId: string; dataSource?: DataSource }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");

  const cfg = dataSource !== "none" ? SOURCE_CFG[dataSource] : null;

  useEffect(() => {
    if (!cfg) { setEntities([]); return; }
    fetch(cfg.endpoint).then((r) => r.json()).then((d) => setEntities(Array.isArray(d) ? d.map((x: Entity) => ({ id: x.id, name: x.name })) : [])).catch(() => {});
  }, [cfg?.endpoint]);

  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/business-docs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, entityId: entityId || null }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/dashboard/business-docs/doc/${id}`);
    } else { setBusy(false); setError((await res.json().catch(() => ({}))).error ?? t("bizdocs.create.err")); }
  }

  return (
    <div>
      {error && <div style={{ background: "var(--brick-soft)", color: "var(--brick)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      {cfg && entities.length > 0 && (
        <div style={{ marginBottom: 12, maxWidth: 320 }}>
          <label style={{ fontSize: 12.5 }}>{t(cfg.labelKey)}</label>
          <select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
            <option value="">{t(cfg.noneKey)}</option>
            {entities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <button onClick={create} disabled={busy} className="btn btn-primary" style={{ fontSize: 15, padding: "12px 30px" }}>
        {busy ? t("bizdocs.create.creating") : t("bizdocs.create.create")}
      </button>
    </div>
  );
}
