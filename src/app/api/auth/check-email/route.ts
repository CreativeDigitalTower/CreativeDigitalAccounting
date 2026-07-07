import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

// Проверява дали имейлът вече е зает от регистриран акаунт (с парола).
// Позволява поканени потребители без парола да завършат регистрацията си.
export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { passwordHash: true } });
    return NextResponse.json({ available: !user?.passwordHash });
  } catch {
    return NextResponse.json({ available: true });
  }
}
