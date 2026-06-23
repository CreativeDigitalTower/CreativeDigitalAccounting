import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 32px 100px" }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, margin: "0 0 20px" }}>
          За нас
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 620 }}>
          Creative Digital Accounting е изградена с убеждението, че малкият бизнес
          заслужава същите мощни инструменти като корпорациите — само по-прости и по-достъпни.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>
        {[
          {
            title: "Нашата мисия",
            text: "Да освободим предприемачите от административната тежест, за да могат да се фокусират върху това, което наистина важи — развитието на бизнеса.",
          },
          {
            title: "Нашият подход",
            text: "Не \"счетоводен софтуер\", а модерна бизнес платформа с интуитивен дизайн. Всяка функция е измислена от реалните нужди на българските МСП.",
          },
          {
            title: "Съответствие",
            text: "Двойно EUR/BGN обозначаване, ДДС ставки 20%/9%/0%, SAF-T готовност и Bulgarian VIES валидация — покриваме всички български изисквания.",
          },
          {
            title: "Сигурност",
            text: "Multi-tenant изолация — всяка фирма вижда само своите данни. Данните се съхраняват в сигурна PostgreSQL среда с редовни резервни копия.",
          },
        ].map((item) => (
          <div key={item.title} className="glass panel" style={{ padding: "24px" }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: "0 0 10px" }}>{item.title}</h3>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5, lineHeight: 1.6 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <div className="glass panel" style={{ padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 12px" }}>
          Готови да опитате?
        </h2>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          Регистрацията отнема 5 минути. Без кредитна карта.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register" className="btn btn-primary">Регистрирай се безплатно</Link>
          <Link href="/contact" className="btn btn-ghost">Свържи се с нас</Link>
        </div>
      </div>
    </div>
  );
}
