"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BlogAdminActions({ hasPosts }: { hasPosts: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function seed() {
    if (!confirm("Зареждане на 10-те начални SEO статии? Вече съществуващите се пропускат.")) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/blog/seed", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (res.ok) { setMsg(`Заредени ${d.created} нови статии.`); router.refresh(); }
    else setMsg("Грешка при зареждане.");
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {msg && <span style={{ fontSize: 12, color: "var(--emerald-dark)" }}>{msg}</span>}
      <button onClick={seed} disabled={busy} className="btn btn-ghost btn-sm">{busy ? "Зареждане…" : "⤓ Зареди 10 SEO статии"}</button>
    </span>
  );
}
