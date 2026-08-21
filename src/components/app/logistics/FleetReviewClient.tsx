"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT, useI18n } from "@/components/i18n/I18nProvider";

type Gap = "driver" | "trailer" | "cargo" | "payload";
type Row = {
  id: string; truck: string; trailer: string | null; carrierName: string | null;
  driver: string | null; driverPhone: string | null; cargoMode: string;
  maxPayloadTons: number | null; active: boolean; gaps: Gap[];
};
type Summary = { total: number; missingDriver: number; missingTrailer: number; missingCargo: number; missingPayload: number; incomplete: number; complete: number };

type Draft = { defaultDriver: string; driverPhone: string; trailerReg: string; cargoMode: string; maxPayloadTons: string };

export function FleetReviewClient({ canManage }: { canManage: boolean }) {
  const t = useT();
  const { qty, qtyUnit } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/logistics/fleet-review${showAll ? "?all=1" : ""}`);
    if (r.ok) { const j = await r.json(); setRows(j.rows); setSummary(j.summary); }
  }, [showAll]);
  useEffect(() => { void load(); }, [load]);

  function startEdit(r: Row) {
    setErr(""); setEditing(r.id);
    setDraft({
      defaultDriver: r.driver ?? "", driverPhone: r.driverPhone ?? "",
      trailerReg: r.trailer ?? "", cargoMode: r.cargoMode ?? "",
      maxPayloadTons: r.maxPayloadTons != null ? String(r.maxPayloadTons) : "",
    });
  }

  async function save(id: string) {
    if (!draft) return;
    setBusy(true); setErr("");
    // Изпращаме само реално попълнените полета — не презаписваме с празно (§34).
    const body: Record<string, unknown> = {};
    if (draft.defaultDriver.trim()) body.defaultDriver = draft.defaultDriver.trim();
    if (draft.driverPhone.trim()) body.driverPhone = draft.driverPhone.trim();
    if (draft.trailerReg.trim()) body.trailerReg = draft.trailerReg.trim();
    if (draft.cargoMode) body.cargoMode = draft.cargoMode;
    if (draft.maxPayloadTons.trim() && Number(draft.maxPayloadTons) > 0) body.maxPayloadTons = Number(draft.maxPayloadTons);
    const r = await fetch(`/api/logistics/vehicle-configs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error ?? t("logistics.common.err")); return; }
    setEditing(null); setDraft(null); await load();
  }

  const cargoLabel = (m: string) => m === "bulk" ? t("logistics.fleet.bulk") : m === "bags" ? t("logistics.fleet.bags") : "—";
  const th = { textAlign: "left" as const, padding: "7px 8px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" as const };
  const td = { padding: "7px 8px", fontSize: 12.5, borderTop: "1px solid rgba(217,215,200,.5)", verticalAlign: "top" as const };
  const inp = { padding: "4px 7px", fontSize: 12, width: "100%" } as const;

  const gapChip = (g: Gap) => (
    <span key={g} style={{ display: "inline-block", fontSize: 10.5, padding: "1px 6px", borderRadius: 8, background: "rgba(178,72,42,.12)", color: "var(--brick)", marginRight: 4, marginBottom: 2 }}>
      {t(`logistics.fleet.review.gap.${g}`)}
    </span>
  );

  function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
      <div className="glass panel" style={{ padding: "10px 14px", minWidth: 120 }}>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "'Fraunces', serif", color: warn && value > 0 ? "var(--brick)" : "inherit" }}>{value}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <Link href="/dashboard/logistics/fleet" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← {t("logistics.fleet.title")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("logistics.fleet.review.title")}</h1>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>{t("logistics.fleet.review.intro")}</p>

      {summary && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Stat label={t("logistics.fleet.review.stat.total")} value={summary.total} />
          <Stat label={t("logistics.fleet.review.stat.complete")} value={summary.complete} />
          <Stat label={t("logistics.fleet.review.stat.incomplete")} value={summary.incomplete} warn />
          <Stat label={t("logistics.fleet.review.gap.driver")} value={summary.missingDriver} warn />
          <Stat label={t("logistics.fleet.review.gap.cargo")} value={summary.missingCargo} warn />
          <Stat label={t("logistics.fleet.review.gap.payload")} value={summary.missingPayload} warn />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          {t("logistics.fleet.review.showAll")}
        </label>
        {err && <span style={{ color: "var(--brick)", fontSize: 12 }}>{err}</span>}
      </div>

      <div className="glass panel" style={{ overflowX: "auto" }}>
        {rows.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)" }}>{t("logistics.fleet.review.allComplete")}</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>{t("logistics.fleet.truck")}</th><th style={th}>{t("logistics.fleet.trailer")}</th><th style={th}>{t("logistics.fleet.carrier")}</th>
              <th style={th}>{t("logistics.fleet.driverCol")}</th><th style={th}>{t("logistics.fleet.cargo")}</th><th style={th}>{t("logistics.fleet.maxLoad")}</th>
              <th style={th}>{t("logistics.fleet.review.missing")}</th>{canManage && <th style={th} />}
            </tr></thead>
            <tbody>
              {rows.map((r) => editing === r.id && draft ? (
                <tr key={r.id}>
                  <td style={td} className="num">{r.truck}</td>
                  <td style={td}><input style={inp} value={draft.trailerReg} onChange={(e) => setDraft({ ...draft, trailerReg: e.target.value })} placeholder={t("logistics.fleet.trailer")} /></td>
                  <td style={td}>{r.carrierName ?? "—"}</td>
                  <td style={td}>
                    <input style={inp} value={draft.defaultDriver} onChange={(e) => setDraft({ ...draft, defaultDriver: e.target.value })} placeholder={t("logistics.fleet.driverCol")} />
                    <input style={{ ...inp, marginTop: 3 }} value={draft.driverPhone} onChange={(e) => setDraft({ ...draft, driverPhone: e.target.value })} placeholder="+389…" />
                  </td>
                  <td style={td}>
                    <select style={inp} value={draft.cargoMode} onChange={(e) => setDraft({ ...draft, cargoMode: e.target.value })}>
                      <option value="">—</option>
                      <option value="bulk">{t("logistics.fleet.bulk")}</option>
                      <option value="bags">{t("logistics.fleet.bags")}</option>
                    </select>
                  </td>
                  <td style={td}><input type="number" step="0.1" style={inp} value={draft.maxPayloadTons} onChange={(e) => setDraft({ ...draft, maxPayloadTons: e.target.value })} placeholder="26.0" /></td>
                  <td style={td} />
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-primary" style={{ padding: "3px 10px", fontSize: 12 }} disabled={busy} onClick={() => save(r.id)}>{busy ? "…" : t("logistics.fleet.review.save")}</button>
                      <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} disabled={busy} onClick={() => { setEditing(null); setDraft(null); }}>{t("logistics.fleet.review.cancel")}</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                  <td style={td} className="num">{r.truck}</td>
                  <td style={td} className="num">{r.trailer ?? "—"}</td>
                  <td style={td}>{r.carrierName ?? "—"}</td>
                  <td style={td}>{r.driver ?? "—"}{r.driverPhone ? <div style={{ fontSize: 11, color: "var(--muted)" }} className="num">{r.driverPhone}</div> : null}</td>
                  <td style={td}>{cargoLabel(r.cargoMode)}</td>
                  <td style={td} className="num">{r.maxPayloadTons != null ? qtyUnit(r.maxPayloadTons, "t") : "—"}</td>
                  <td style={td}>{r.gaps.length ? r.gaps.map(gapChip) : <span style={{ color: "var(--muted)" }}>✓</span>}</td>
                  {canManage && <td style={td}>{r.gaps.length > 0 && <button className="btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => startEdit(r)}>{t("logistics.fleet.review.complete")}</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!canManage && <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10 }}>{t("logistics.fleet.readOnly")}</p>}
    </div>
  );
}
