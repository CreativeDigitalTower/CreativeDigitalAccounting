"use client";
import { toNumber, parseLocalizedNumber } from "@/lib/number";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export default function NewAssetPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"), category: fd.get("category"),
        acquiredDate: fd.get("acquiredDate"), value: toNumber(fd.get("value")),
        annualDepreciation: fd.get("annualDepreciation") ? (parseLocalizedNumber(fd.get("annualDepreciation") as string) ?? 0) : 0,
        warrantyUntil: fd.get("warrantyUntil") || null,
        insuranceUntil: fd.get("insuranceUntil") || null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/assets");
    else setError((await res.json()).error ?? t("assets.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/assets" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("assets.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("assets.new.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("assets.new.f.name")}</label><input type="text" name="name" required placeholder={t("assets.new.f.namePh")} /></div>
            <div><label>{t("assets.new.f.category")}</label>
              <select name="category" required defaultValue="">
                <option value="" disabled>{t("assets.new.f.categorySelect")}</option>
                {["machines","computers","vehicles","furniture","buildings","intangible","other"].map(c=><option key={c} value={c}>{t(`assets.categories.${c}`)}</option>)}
              </select>
            </div>
            <div><label>{t("assets.new.f.acquired")}</label><input type="date" name="acquiredDate" required defaultValue={new Date().toISOString().slice(0,10)} /></div>
            <div><label>{t("assets.new.f.value")}</label><input type="text" inputMode="decimal" name="value" required /></div>
            <div><label>{t("assets.new.f.depreciation")}</label><input type="text" inputMode="decimal" name="annualDepreciation" defaultValue={0} /></div>
            <div><label>{t("assets.new.f.warranty")}</label><input type="date" name="warrantyUntil" /></div>
            <div><label>{t("assets.new.f.insurance")}</label><input type="date" name="insuranceUntil" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/assets" className="btn btn-ghost">{t("assets.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("assets.new.saving") : t("assets.new.save")}</button>
        </div>
      </form>
    </>
  );
}
