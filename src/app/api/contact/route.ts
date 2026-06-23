import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import { COMPANY_EMAIL } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().min(5),
});

export async function POST(req: Request) {
  try {
    const data = schema.parse(await req.json());

    const text = [
      `Ново съобщение от контактната форма на Creative Digital Accounting`,
      ``,
      `Име: ${data.name}`,
      `Имейл: ${data.email}`,
      `Фирма: ${data.company ?? "—"}`,
      ``,
      `Съобщение:`,
      data.message,
    ].join("\n");

    await sendMail({
      to: COMPANY_EMAIL,
      subject: `Запитване от ${data.name}`,
      text,
      replyTo: data.email,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Невалидни данни." }, { status: 400 });
    }
    return NextResponse.json({ error: "Грешка при изпращане." }, { status: 500 });
  }
}
