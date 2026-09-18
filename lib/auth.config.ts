import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe auth config (no Prisma adapter). Used directly by middleware so
 * the middleware bundle never pulls in `@prisma/client`, which cannot run in
 * the Edge runtime. The full config in `lib/auth.ts` extends this with the
 * Prisma adapter for actual API/server-side usage.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
