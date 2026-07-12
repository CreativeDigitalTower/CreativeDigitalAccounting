"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError(t("auth.login.invalid"));
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="glass panel" style={{ padding: "40px 36px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>
          {t("auth.login.title")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 28px" }}>
          {t("auth.login.subtitle")}
        </p>

        {error && (
          <div
            style={{
              background: "var(--brick-soft)",
              border: "1px solid var(--brick)",
              color: "var(--brick)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label>{t("auth.login.email")}</label>
            <input type="email" name="email" required placeholder="ivan@firma.bg" autoComplete="email" />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label>{t("auth.login.password")}</label>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600 }}>{t("auth.login.forgot")}</Link>
            </div>
            <input type="password" name="password" required placeholder="••••••••" autoComplete="current-password" />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)" }}>
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" style={{ color: "var(--navy)", fontWeight: 600 }}>
            {t("auth.login.registerFree")}
          </Link>
        </p>
      </div>
    </div>
  );
}
