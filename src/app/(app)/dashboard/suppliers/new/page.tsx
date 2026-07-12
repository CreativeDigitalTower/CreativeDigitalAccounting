"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export default function NewSupplierPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/suppliers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        eik: fd.get("eik") || undefined,
        vatNumber: fd.get("vatNumber") || undefined,
        address: fd.get("address") || undefined,
        contactEmail: fd.get("contactEmail") || undefined,
        phone: fd.get("phone") || undefined,
        rating: fd.get("rating") ? Number(fd.get("rating")) : undefined,
        notes: fd.get("notes") || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard/suppliers");
    else setError((await res.json()).error ?? t("suppliers.errSave"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/suppliers" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("suppliers.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("suppliers.new.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("suppliers.new.f.name")}</label><input type="text" name="name" required placeholder={t("suppliers.new.f.namePh")} /></div>
            <div><label>{t("suppliers.new.f.eik")}</label><input type="text" name="eik" /></div>
            <div><label>{t("suppliers.new.f.vat")}</label><input type="text" name="vatNumber" /></div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("suppliers.new.f.address")}</label><input type="text" name="address" /></div>
            <div><label>{t("suppliers.new.f.email")}</label><input type="email" name="contactEmail" /></div>
            <div><label>{t("suppliers.new.f.phone")}</label><input type="text" name="phone" /></div>
            <div><label>{t("suppliers.new.f.rating")}</label>
              <select name="rating"><option value="">—</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}><label>{t("suppliers.new.f.notes")}</label><textarea name="notes" rows={3} /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/suppliers" className="btn btn-ghost">{t("suppliers.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("suppliers.new.saving") : t("suppliers.new.save")}</button>
        </div>
      </form>
    </>
  );
}
