import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  let ok = false;
  if (token) {
    const rec = await prisma.verificationToken.findUnique({ where: { token } });
    if (rec && rec.expires > new Date()) {
      const user = await prisma.user.update({ where: { email: rec.identifier }, data: { emailVerified: new Date() }, select: { id: true, name: true } }).catch(() => null);
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      ok = true;
      // ─── Meta: потвърден имейл ───
      try {
        const { sendMetaEvent, newEventId } = await import("@/lib/meta");
        await sendMetaEvent({
          eventName: "EmailVerified", eventId: newEventId(), actionSource: "system_generated",
          user: { email: rec.identifier, firstName: user?.name?.split(" ")[0], externalId: user?.id },
        });
      } catch { /* ignore */ }
    }
  }
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div className="glass panel" style={{ padding: "40px 36px", textAlign: "center" }}>
        <div style={{ display:"flex",justifyContent:"center",marginBottom: 12, color: ok ? "var(--emerald)" : "var(--brick)" }}>{ok ? <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg> : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 1.5 21h21L12 3Z"/><path d="M12 10v5M12 18h.01"/></svg>}</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, margin: "0 0 10px" }}>
          {ok ? t("auth.verify.okTitle") : t("auth.verify.failTitle")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          {ok ? t("auth.verify.okText") : t("auth.verify.failText")}
        </p>
        <Link href="/login" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }}>{t("auth.verify.toLogin")}</Link>
      </div>
    </div>
  );
}
