import type { Metadata } from "next";
import Link from "next/link";
import { IconRocket, IconInvoice, IconCash, IconShield } from "@/components/Icons";
import type { ComponentType } from "react";

export const metadata: Metadata = {
  title: "Често задавани въпроси (ЧЗВ) | Creative Digital Accounting",
  description: "Отговори на най-често задаваните въпроси за онлайн фактуриране, миграция от друг софтуер, абонаменти и работа с платформата Creative Digital Accounting.",
};

type QA = { q: string; a: string[]; highlight?: boolean };

const GROUPS: { title: string; Icon: ComponentType; items: QA[] }[] = [
  {
    title: "Започване и миграция", Icon: IconRocket,
    items: [
      { highlight: true, q: "Вече използвам друг софтуер за фактуриране. Мога ли да премина към Creative Digital Accounting без проблеми?",
        a: [
          "Да, напълно. Няма никакъв счетоводен или юридически проблем да преминете към нова платформа за издаване на фактури по всяко време.",
          "Всички Ваши предходно издадени фактури се запазват — те остават валидни и не се засягат. Единственото важно нещо е номерацията на документите: тя трябва да продължи без прекъсване и без дублиране.",
          "В платформата можете свободно да зададете от кой пореден номер да продължи фактурирането (има опция за отключване и редакция на номера до всяка фактура), така че да продължите точно оттам, докъдето сте стигнали.",
        ] },
      { q: "Ще загубя ли данните си при миграция?",
        a: ["Не. Можете да въведете съществуващите си клиенти, както и оборота, който вече сте реализирали с всеки от тях (със задна дата). Новите фактури през системата се добавят върху този начален оборот, така че статистиките Ви продължават без прекъсване."] },
      { q: "Колко бързо мога да започна?",
        a: ["Регистрацията отнема под 2 минути. След това попълвате данните на фирмата веднъж и издавате първата си фактура веднага."] },
    ],
  },
  {
    title: "Фактуриране и документи", Icon: IconInvoice,
    items: [
      { q: "Как започва номерацията на фактурите за нов акаунт?",
        a: ["Номерацията е автоматична и започва от началото (0000000001). До всяка фактура има опция за отключване и ръчна редакция на поредния номер — ако зададете номер X, номерацията продължава оттам нататък."] },
      { q: "Какви документи мога да издавам?",
        a: ["Фактури, проформи, оферти, кредитни и дебитни известия, както и над 100 шаблона за бизнес документи с професионален дизайн."] },
      { q: "Задължителна ли е регистрация по ДДС?",
        a: ["Не. Платформата работи и за фирми, които не са регистрирани по ЗДДС — тогава фактурите се издават без ДДС. За регистрираните системата изчислява данъка автоматично."] },
    ],
  },
  {
    title: "Абонаменти и плащания", Icon: IconCash,
    items: [
      { q: "Има ли безплатен план и безплатен тест?",
        a: ["Да. Има безплатен план завинаги, а плановете Старт и Бизнес имат еднократен 7-дневен безплатен тест."] },
      { q: "Как се плаща абонаментът?",
        a: ["По банков път. След заявка получавате имейл с данните за плащане (IBAN, получател, основание и сума). След получаване на плащането активираме плана Ви."] },
      { q: "Мога ли да сменя плана си?",
        a: ["Да, по всяко време — към по-висок или по-нисък план. При изтичане на платен период без подновяване профилът се връща към Безплатния план, а данните Ви се запазват."] },
      { q: "Възстановявате ли платени абонаменти?",
        a: ["Заплащане за абонамент не подлежи на възстановяване. Затова препоръчваме първо да използвате безплатния план и безплатния тест, за да се уверите, че платформата отговаря на нуждите Ви."] },
    ],
  },
  {
    title: "Сигурност и профил", Icon: IconShield,
    items: [
      { q: "Сигурни ли са данните ми?",
        a: ["Да. Данните се съхраняват криптирано, паролите се хешират, а достъпът е изолиран между отделните фирми. Повече в Политиката за информационна сигурност."] },
      { q: "Мога ли да изтрия профила на фирмата си?",
        a: ["Да. От Профил на фирмата → Опасна зона можете да изтриете профила след потвърждение. Действието е необратимо и премахва всички свързани данни."] },
      { q: "Ще има ли мобилно приложение?",
        a: ["Да — мобилно приложение за iOS и Android предстои скоро, както и нови функционалности към платформата."] },
    ],
  },
];

export default function FaqPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px 24px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: "var(--brass)", textTransform: "uppercase", marginBottom: 10 }}>Помощен център</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-.5px" }}>Често задавани въпроси</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15.5, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          Всичко, което трябва да знаете за онлайн фактурирането, миграцията и работата с платформата.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 11 }}>
              <span className="icon-tile" style={{ width: 34, height: 34 }}><g.Icon /></span> {g.title}
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {g.items.map((qa, i) => (
                <details key={i} className="glass panel faq-card" open={qa.highlight}
                  style={{ padding: "16px 20px", borderRadius: 14, borderLeft: qa.highlight ? "4px solid var(--emerald)" : undefined }}>
                  <summary style={{ cursor: "pointer", fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16.5, color: "var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <span>{qa.q}</span>
                    <span style={{ color: "var(--emerald)", fontSize: 22, lineHeight: 1, flexShrink: 0 }}>+</span>
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    {qa.a.map((p, j) => <p key={j} style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.65, color: "var(--ink-soft)" }}>{p}</p>)}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="glass panel" style={{ marginTop: 44, padding: "30px 28px", textAlign: "center", borderRadius: 16 }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, margin: "0 0 8px" }}>Не намерихте отговор?</h3>
        <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 0 18px" }}>Пишете ни — с радост ще Ви помогнем.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/contact" className="btn btn-primary">Свържете се с нас</Link>
          <Link href="/register" className="btn btn-ghost">Започни безплатно</Link>
        </div>
      </div>
    </div>
  );
}
