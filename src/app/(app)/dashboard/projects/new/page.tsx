"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Client = { id: string; name: string };

export default function NewProjectPage() {
  const t = useT();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        clientId: fd.get("clientId") || null,
        budget: fd.get("budget") ? Number(fd.get("budget")) : null,
        plannedBudget: fd.get("plannedBudget") ? Number(fd.get("plannedBudget")) : null,
        deadline: fd.get("deadline") || null,
        progressPercent: fd.get("progressPercent") ? Number(fd.get("progressPercent")) : 0,
        status: fd.get("status"),
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/projects");
    else setError((await res.json()).error ?? t("projects.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/projects" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("projects.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("projects.new.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("projects.new.f.name")}</label><input type="text" name="name" required /></div>
            <div><label>{t("projects.new.f.client")}</label><select name="clientId"><option value="">{t("projects.new.f.noClient")}</option>{clients.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label>{t("projects.new.f.status")}</label><select name="status" defaultValue="active"><option value="active">{t("projects.status.active")}</option><option value="on_hold">{t("projects.status.on_hold")}</option><option value="completed">{t("projects.status.completed")}</option><option value="cancelled">{t("projects.status.cancelled")}</option></select></div>
            <div><label>{t("projects.new.f.budget")}</label><input type="number" name="budget" step="0.01" min="0" /></div>
            <div><label>{t("projects.new.f.plannedBudget")}</label><input type="number" name="plannedBudget" step="0.01" min="0" /></div>
            <div><label>{t("projects.new.f.deadline")}</label><input type="date" name="deadline" /></div>
            <div><label>{t("projects.new.f.progress")}</label><input type="number" name="progressPercent" min="0" max="100" defaultValue={0} /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/projects" className="btn btn-ghost">{t("projects.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("projects.new.saving") : t("projects.new.save")}</button>
        </div>
      </form>
    </>
  );
}
