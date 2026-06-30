import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    const rec = await prisma.verificationToken.findUnique({ where: { token } });
    if (rec && rec.expires > new Date()) {
      await prisma.user.update({ where: { email: rec.identifier }, data: { emailVerified: new Date() } }).catch(() => {});
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      ok = true;
    }
  }
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="glass panel" style={{ padding: "40px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{ok ? "✓" : "⚠️"}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 10px" }}>
          {ok ? "Имейлът е потвърден" : "Невалиден линк"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          {ok ? "Благодарим! Вашият имейл адрес е успешно потвърден." : "Линкът е невалиден или изтекъл."}
        </p>
        <Link href="/login" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }}>Към вход</Link>
      </div>
    </div>
  );
}
