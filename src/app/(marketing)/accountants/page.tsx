import type { Metadata } from "next";
import Link from "next/link";
import { IconBuilding } from "@/components/Icons";

export const metadata: Metadata = {
  title: "За счетоводители — очаквайте скоро",
  description: "Специален модул за счетоводни къщи — управление на множество фирми от едно място. Очаквайте скоро.",
};

export default function AccountantsPage() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px 100px", textAlign: "center" }}>
      <div className="icon-tile" style={{ margin: "0 auto 20px", width: 64, height: 64, borderRadius: 18 }}>
        <IconBuilding />
      </div>
      <div style={{ display: "inline-block", background: "var(--brass-soft)", color: "var(--brass)", borderRadius: 20, padding: "5px 16px", fontSize: 12.5, fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>
        ОЧАКВАЙТЕ СКОРО
      </div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 5vw, 50px)", fontWeight: 700, margin: "0 0 18px" }}>
        За счетоводители и счетоводни къщи
      </h1>
      <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 16px" }}>
        В момента разработваме специален софтуер и раздел, създаден изцяло за нуждите на счетоводните къщи.
      </p>
      <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
        От едно място ще можете да управлявате всички свои клиенти-фирми, да следите документооборота им,
        да автоматизирате повтарящи се задачи и да работите по-бързо и по-лесно — с пълен контрол и видимост.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/contact" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
          Заявете интерес →
        </Link>
        <Link href="/" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 28px" }}>
          Към началото
        </Link>
      </div>
    </div>
  );
}
