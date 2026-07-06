import Link from "next/link";
import type { Metadata } from "next";
import { FirmSubscriptionPlans } from "@/components/app/FirmSubscriptionPlans";
import { IconBuilding, IconChart, IconUsers, IconFileStack, IconRocket, IconShield } from "@/components/Icons";

export const metadata: Metadata = {
  title: "За счетоводители и счетоводни къщи | Creative Digital Accounting",
  description: "Дайте безплатен СТАРТ достъп на всичките си клиенти и управлявайте всички фирми от едно място — с обобщени справки и отделни данни за всяка фирма.",
};

const steps = [
  { n: "1", title: "Регистрирате се като счетоводна къща", desc: "Създайте профил за под 2 минути." },
  { n: "2", title: "Избирате счетоводен план", desc: "Според броя клиенти, които обслужвате." },
  { n: "3", title: "Каните своите клиенти", desc: "По имейл или с личен реферал линк." },
  { n: "4", title: "Всеки клиент получава безплатен СТАРТ", desc: "Без такса и без карта при регистрация." },
  { n: "5", title: "Управлявате всички фирми от едно място", desc: "Обобщени справки и бързо превключване." },
  { n: "6", title: "Клиентите растат заедно с Вас", desc: "Надграждат към платен план при нужда." },
];

const firmBenefits = [
  { Icon: IconBuilding, title: "Всички клиенти на едно място", desc: "Отделен профил за всяка фирма и превключване с един клик." },
  { Icon: IconChart, title: "Обобщени справки", desc: "Приходи, разходи, печалба, ДДС статус и документи на всичките клиенти." },
  { Icon: IconFileStack, title: "Покани и реферал линк", desc: "Каните клиенти по имейл или със собствен реферал линк." },
  { Icon: IconShield, title: "Пълен контрол и сигурност", desc: "Управлявате данните на всеки клиент с ясни права и защита." },
];

const clientBenefits = [
  { Icon: IconRocket, title: "Безплатен СТАРТ достъп", desc: "Пълноценно фактуриране, клиенти, склад и данъчен календар — без такса." },
  { Icon: IconChart, title: "Готово за еврото", desc: "Двойно EUR/BGN обозначаване и пълна съвместимост с новите изисквания." },
  { Icon: IconUsers, title: "Обща работа със счетоводителя", desc: "Счетоводителят вижда и управлява данните, без размяна на файлове." },
];

const faq = [
  { q: "Плащат ли клиентите ми, за да ползват платформата?", a: "Не. Всеки клиент, когото поканите, получава безплатен СТАРТ достъп. Плаща само ако сам реши да надгради към по-висок план." },
  { q: "Мога ли да премина от предишната си счетоводна система към Creative Digital Accounting?", a: "Да. Можете да преминете спокойно от досегашната си система — при необходимост нашият екип ще Ви съдейства за прехвърлянето и настройката, за да започнете работа безпроблемно." },
  { q: "Мога ли да управлявам всичко за клиента?", a: "Да. Влизате във всяка клиентска фирма и работите пълноценно — фактури, разходи, склад, заплати, анализи и всичко останало." },
  { q: "Има ли лимит на клиентите?", a: "Зависи от плана: Счетоводен Старт — до 10, Счетоводен Про — до 50, Счетоводна кантора — до 150, Счетоводна къща — неограничени." },
  { q: "Какво включва безплатният СТАРТ достъп за клиента?", a: "Фактуриране, клиенти и доставчици, базов склад, разходи, данъчен календар и двойно EUR/BGN обозначаване — напълно безплатно." },
];

export default function AccountantsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px 90px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <span style={{ display: "inline-block", background: "var(--navy-soft)", color: "var(--navy)", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "5px 16px", borderRadius: 20, marginBottom: 16 }}>ЗА СЧЕТОВОДИТЕЛИ И СЧЕТОВОДНИ КЪЩИ</span>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 16px", lineHeight: 1.1 }}>
          Дайте безплатен СТАРТ достъп до<br /><span style={{ color: "var(--emerald)" }}>Creative Digital Accounting на всичките си клиенти</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Управлявайте всички клиентски фирми от едно място. Клиентите Ви използват СТАРТ безплатно и могат да надградят към по-висок план по всяко време.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>Започнете като счетоводител →</Link>
          <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>Свържете се с нас</Link>
        </div>
      </div>

      {/* Как работи */}
      <section style={{ marginBottom: 60 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 28 }}>Как работи</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {steps.map((s) => (
            <div key={s.n} className="glass panel hover-lift" style={{ padding: "22px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -14, right: -4, fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 84, color: "rgba(15,138,106,.07)", lineHeight: 1 }}>{s.n}</div>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, var(--emerald), var(--emerald-dark))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 17, marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontFamily: "'Fraunces', serif", fontWeight: 700, position: "relative" }}>{s.title}</h3>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.5, position: "relative" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Безплатен СТАРТ акцент */}
      <section className="glass panel" style={{ padding: "32px 28px", marginBottom: 60, textAlign: "center", borderLeft: "4px solid var(--emerald)" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>Всеки Ваш клиент получава безплатен СТАРТ достъп</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.65, maxWidth: 760, margin: "0 auto" }}>
          СТАРТ включва фактуриране, клиенти и доставчици, базов склад, разходи, данъчен календар и двойно EUR/BGN обозначаване — напълно безплатно за клиента. Ако клиентът поиска повече функции, може да надгради към по-висок план по всяко време.
        </p>
      </section>

      {/* Предимства */}
      <section style={{ marginBottom: 60 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }} className="acc-benefits">
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>За счетоводната къща</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {firmBenefits.map((b) => (
                <div key={b.title} className="glass panel" style={{ padding: "16px 18px", display: "flex", gap: 12 }}>
                  <div className="icon-tile" style={{ width: 40, height: 40, flexShrink: 0 }}><b.Icon /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{b.title}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>За клиентите</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clientBenefits.map((b) => (
                <div key={b.title} className="glass panel" style={{ padding: "16px 18px", display: "flex", gap: 12 }}>
                  <div className="icon-tile" style={{ width: 40, height: 40, flexShrink: 0 }}><b.Icon /></div>
                  <div><div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Fraunces', serif" }}>{b.title}</div><div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>{b.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Планове */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, margin: "0 0 8px" }}>Планове за счетоводители</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Изберете според броя фирми, които обслужвате · Всички цени са без ДДС</p>
        </div>
        <FirmSubscriptionPlans currentPlan={null} />
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>Започнете като счетоводител →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>Често задавани въпроси</h2>
        <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {faq.map((f) => (
            <div key={f.q} className="glass panel" style={{ padding: "18px 22px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Fraunces', serif", marginBottom: 6 }}>{f.q}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="glass panel" style={{ padding: "36px 28px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, margin: "0 0 12px" }}>Готови ли сте да започнете?</h2>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 auto 22px", maxWidth: 620, lineHeight: 1.6 }}>
          Регистрирайте се като счетоводна къща, поканете клиентите си и управлявайте всички фирми от едно място.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register?accountType=accounting" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 26px" }}>Започнете като счетоводител</Link>
          <Link href="/contact" className="btn btn-ghost" style={{ fontSize: 15, padding: "12px 26px" }}>Свържете се с нас</Link>
        </div>
      </section>
    </div>
  );
}
