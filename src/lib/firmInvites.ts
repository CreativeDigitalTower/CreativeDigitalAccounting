import { sendEmail } from "@/lib/email/send";
import { baseTemplate, APP_URL } from "@/lib/email/templates";
import { PLATFORM_NAME } from "@/lib/constants";

/** Изпраща покана към клиентска фирма от счетоводна къща (с реферал линк). */
export async function sendClientInvite(opts: { firmName: string; partnerCode: string | null; email: string; name?: string | null }) {
  const link = `${APP_URL}/register?accountType=business${opts.partnerCode ? `&partner=${opts.partnerCode}` : ""}`;
  const html = baseTemplate({
    eyebrow: "Покана",
    title: `${opts.firmName} Ви кани в ${PLATFORM_NAME}`,
    preheader: `Безплатен СТАРТ достъп до ${PLATFORM_NAME}`,
    intro: [
      `Вашият счетоводител <strong>${opts.firmName}</strong> Ви кани да ползвате ${PLATFORM_NAME} — модерна платформа за фактури, склад, разходи и финансови анализи.`,
      `Получавате <strong>безплатен СТАРТ достъп</strong>. Регистрирайте се за минути и започнете работа. При желание можете да надградите към по-висок план по всяко време.`,
    ],
    button: { label: "Приемете поканата", url: link },
    footnote: `Ако бутонът не работи, копирайте този адрес: ${link}`,
  });
  await sendEmail({
    to: opts.email, toName: opts.name ?? undefined,
    subject: `${opts.firmName} Ви кани в ${PLATFORM_NAME} (безплатен СТАРТ достъп)`,
    html, category: "transactional", type: "client_invite", force: true,
  });
}
