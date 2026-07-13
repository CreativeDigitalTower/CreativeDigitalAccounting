"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export default function InviteUserPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(""); setOk(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), firstName: fd.get("firstName"), lastName: fd.get("lastName"), role: fd.get("role") }),
    });
    setSaving(false);
    if (res.ok) { setOk(true); setTimeout(() => router.push("/dashboard/users"), 1200); }
    else setError((await res.json()).error ?? t("account.invite.errGeneric"));
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/users" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("account.invite.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("account.invite.heading")}</h1>
      </div>
      {error && <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {ok && <div style={{ background: "var(--emerald-soft)", border: "1px solid var(--emerald)", color: "var(--emerald)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{t("account.invite.added")}</div>}
      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: 28, marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 18px" }}>
            {t("account.invite.intro")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
            <div><label>{t("account.invite.firstName")}</label><input type="text" name="firstName" required placeholder={t("account.invite.firstNamePh")} /></div>
            <div><label>{t("account.invite.lastName")}</label><input type="text" name="lastName" required placeholder={t("account.invite.lastNamePh")} /></div>
            <div><label>{t("account.invite.email")}</label><input type="email" name="email" required placeholder={t("account.invite.emailPh")} /></div>
            <div><label>{t("account.invite.role")}</label>
              <select name="role" required defaultValue="viewer">
                <option value="manager">{t("account.users.roles.manager")}</option>
                <option value="accountant">{t("account.users.roles.accountant")}</option>
                <option value="sales">{t("account.users.roles.sales")}</option>
                <option value="warehouse">{t("account.users.roles.warehouse")}</option>
                <option value="viewer">{t("account.users.roles.viewer")}</option>
                <option value="employee">{t("account.invite.roleEmployee")}</option>
              </select>
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{t("account.invite.roleHint")}</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/users" className="btn btn-ghost">{t("account.invite.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("account.invite.adding") : t("account.invite.add")}</button>
        </div>
      </form>
    </>
  );
}
