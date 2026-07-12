"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

type Category = { id: string; name: string };
type Supplier = { id: string; name: string };

export default function NewExpensePage() {
  const t = useT();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState("");

  useEffect(() => {
    fetch("/api/expense-categories").then((r) => r.json()).then(setCategories);
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError(t("expenses.new.fileTooLarge"));
      return;
    }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(fd.get("amount") as string);
    const vatRate = parseFloat(fd.get("vatRate") as string) / 100;
    const vatAmount = amount * vatRate / (1 + vatRate);

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: fd.get("categoryId"),
        supplierId: fd.get("supplierId") || null,
        description: fd.get("description"),
        invoiceNumber: (fd.get("invoiceNumber") as string) || null,
        amount,
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        date: fd.get("date"),
        source: (fd.get("invoiceNumber") as string) ? "incoming_invoice" : "manual",
        attachmentUrl: attachment,
        isRecurring: !!fd.get("isRecurring"),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t("expenses.errSave"));
    } else {
      router.push("/dashboard/expenses");
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/dashboard/expenses" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}>{t("expenses.new.back")}</Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: 0 }}>{t("expenses.new.heading")}</h1>
      </div>

      {error && (
        <div style={{ background: "var(--brick-soft)", border: "1px solid var(--brick)", color: "var(--brick)", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass panel" style={{ padding: "28px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>{t("expenses.new.f.description")}</label>
              <input type="text" name="description" required placeholder={t("expenses.new.f.descriptionPh")} />
            </div>
            <div>
              <label>{t("expenses.new.f.invoiceNumber")}</label>
              <input type="text" name="invoiceNumber" placeholder={t("expenses.new.f.invoiceNumberPh")} />
            </div>
            <div>
              <label>{t("expenses.new.f.category")}</label>
              <select name="categoryId" required>
                <option value="">{t("expenses.new.f.selectCat")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("expenses.new.f.supplier")}</label>
              <select name="supplierId">
                <option value="">{t("expenses.new.f.noSupplier")}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>{t("expenses.new.f.gross")}</label>
              <input type="number" name="amount" required min="0" step="0.01" placeholder="100.00" />
            </div>
            <div>
              <label>{t("expenses.new.f.vatRate")}</label>
              <select name="vatRate">
                <option value="20">20%</option>
                <option value="9">9%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div>
              <label>{t("expenses.new.f.date")}</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>{t("expenses.new.f.attach")}</label>
              <input type="file" accept="application/pdf,image/*" onChange={handleFile} style={{ fontSize: 13 }} />
              {attachmentName && <div style={{ fontSize: 12, color: "var(--emerald)", marginTop: 6 }}>{t("expenses.new.f.attached")} {attachmentName}</div>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
                <input type="checkbox" name="isRecurring" style={{ width: "auto" }} /> {t("expenses.new.f.recurring")}
              </label>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>{t("expenses.new.f.recurringHint")}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/dashboard/expenses" className="btn btn-ghost">{t("expenses.new.cancel")}</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("expenses.new.saving") : t("expenses.new.save")}
          </button>
        </div>
      </form>
    </>
  );
}
