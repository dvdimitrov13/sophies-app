import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const VALID_USER = {
  email: "sophie@coolness.com",
  // bcrypt hash of "sophiescool"
  passwordHash: "$2b$10$yveGtXAxwq2zVXqt47VzSubPzxlX2OlXCbQWg5cvDrs7aIJz4TDKO",
  name: "Sophie",
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;
        if (email.toLowerCase() !== VALID_USER.email) return null;

        const valid = await bcrypt.compare(password, VALID_USER.passwordHash);
        if (!valid) return null;

        return {
          id: "1",
          email: VALID_USER.email,
          name: VALID_USER.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
