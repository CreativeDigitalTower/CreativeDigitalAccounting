"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UiIcon } from "@/components/app/NavIcons";
import { confirmDelete } from "@/lib/confirmDelete";

type Supplier = {
  id: string; name: string; eik: string | null; vatNumber: string | null; address: string | null; city: string | null;
  contactPerson: string | null; contactEmail: string | null; phone: string | null; website: string | null;
  rating: number | null; notes: string | null;
};

const ROWS: [string, keyof Supplier][] = [
  ["ЕИК", "eik"], ["ДДС №", "vatNumber"], ["Лице за контакт", "contactPerson"], ["Имейл", "contactEmail"],
  ["Телефон", "phone"], ["Уебсайт", "website"], ["Град", "city"], ["Адрес", "address"],
];

export function SupplierInfoCard({ supplier }: { supplier: Supplier }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [edit, setEdit] = useState(searchParams.get("edit") === "1");
  const [f, setF] = useState(supplier);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/suppliers/${supplier.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, eik: f.eik, vatNumber: f.vatNumber, address: f.address, city: f.city,
        contactPerson: f.contactPerson, contactEmail: f.contactEmail || "", phone: f.phone, website: f.website,
        rating: f.rating, notes: f.notes,
      }),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); router.refresh(); }
  }

  async function remove() {
    if (!(await confirmDelete(`доставчика „${supplier.name}"`))) return;
    setBusy(true);
    const res = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard/suppliers");
    else alert((await res.json().catch(() => ({}))).error ?? "Грешка при изтриване.");
  }

  return (
    <div className="glass panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, margin: 0 }}>Данни за доставчика</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => (edit ? save() : setEdit(true))} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{edit ? (busy ? "Запазване…" : "Запази") : <><UiIcon.edit /> Редактирай</>}</button>
          {!edit && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={remove} title="Изтрий доставчик" style={{ color: "var(--brick)", borderColor: "var(--brick)", display: "inline-flex", alignItems: "center" }}><UiIcon.trash /></button>}
        </div>
      </div>

      {edit ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Наименование</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          {ROWS.map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 12 }}>{l}</label><input value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          ))}
          <div><label style={{ fontSize: 12 }}>Рейтинг (1–5)</label><input type="number" min={1} max={5} value={f.rating ?? ""} onChange={(e) => setF({ ...f, rating: e.target.value ? Number(e.target.value) : null })} style={{ padding: "6px 9px", fontSize: 13 }} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12 }}>Бележки</label><textarea value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={3} style={{ padding: "6px 9px", fontSize: 13, width: "100%" }} /></div>
        </div>
      ) : (
        <>
          <dl style={{ margin: 0, fontSize: 13, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px" }}>
            {ROWS.map(([l, k]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ color: "var(--muted)" }}>{l}</dt>
                <dd style={{ margin: 0, fontWeight: 500 }}>{(supplier[k] as string) || "—"}</dd>
              </div>
            ))}
          </dl>
          {supplier.notes && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12, whiteSpace: "pre-wrap" }}>{supplier.notes}</p>}
        </>
      )}
    </div>
  );
}
