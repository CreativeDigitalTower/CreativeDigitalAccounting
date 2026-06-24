"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        eik: fd.get("eik") || undefined,
        vatNumber: fd.get("vatNumber") || undefined,
        contactPerson: fd.get("contactPerson") || undefined,
        mol: fd.get("mol") || undefined,
        address: fd.get("address") || undefined,
        city: fd.get("city") || undefined,
        contactEmail: fd.get("contactEmail") || undefined,
        phone: fd.get("phone") || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Грешка при запис.");
    } else {
      router.push("/dashboard/clients");
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>← Клиенти</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Нов клиент</h1>
      </div>

      {error && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: "28px", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, margin: "0 0 18px" }}>Основни данни</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Наименование / Пълно име *</label>
              <input type="text" name="name" required placeholder="ЕООД Примерна" />
            </div>
            <div>
              <label>ЕИК / Булстат</label>
              <input type="text" name="eik" placeholder="123456789" />
            </div>
            <div>
              <label>ДДС номер</label>
              <input type="text" name="vatNumber" placeholder="BG123456789" />
            </div>
            <div>
              <label>Контактно лице</label>
              <input type="text" name="contactPerson" placeholder="Иван Иванов" />
            </div>
            <div>
              <label>МОЛ</label>
              <input type="text" name="mol" placeholder="Иван Иванов" />
            </div>
            <div>
              <label>Адрес</label>
              <input type="text" name="address" placeholder="ул. Витоша 1" />
            </div>
            <div>
              <label>Град</label>
              <input type="text" name="city" placeholder="София" />
            </div>
            <div>
              <label>Имейл за контакт</label>
              <input type="email" name="contactEmail" placeholder="office@firma.bg" />
            </div>
            <div>
              <label>Телефон</label>
              <input type="text" name="phone" placeholder="+359 2 123 4567" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/clients" className="btn btn-ghost">Отказ</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Записване…" : "Запази клиент"}
          </button>
        </div>
      </form>
    </>
  );
}
