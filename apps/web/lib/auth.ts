import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Only allow existing users - prevent auto-creation
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          // Return null to indicate authentication failed
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      }
    })
  ],
  pages: {
    signIn: "/"
  }
};
