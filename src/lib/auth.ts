import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Фиктивен bcrypt хеш за изравняване на времето при несъществуващ потребител
// (защита срещу изброяване на имейли по време на отговор).
const DUMMY_HASH = "$2b$12$W1Y/3A/Zz9FvyR/QqFXeGutE020ajjrmQ7QiNuHU1RpSwHRFhsluG";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Брутфорс защита: лимит по IP и по имейл (in-memory на инстанция).
        const ip = request instanceof Request ? clientIp(request) : "unknown";
        const email = parsed.data.email.toLowerCase();
        if (!rateLimit(`login-ip:${ip}`, 10, 15 * 60 * 1000)) return null;
        if (!rateLimit(`login-acc:${email}`, 8, 15 * 60 * 1000)) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Винаги правим bcrypt сравнение (срещу фиктивен хеш при липсващ потребител),
        // за да е постоянно времето за отговор.
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const valid = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !user.passwordHash || !valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
