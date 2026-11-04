import type { NextAuthConfig } from "next-auth";
import { AUTH } from "@/config";
import { esRol } from "@/lib/roles";

// Configuración sin dependencias de Node (bcrypt/Prisma) para poder usarla en el middleware.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: AUTH.sesionSegundos },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const conSesion = !!auth?.user;
      if (nextUrl.pathname === "/login") {
        return conSesion ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      return conSesion;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && esRol(token.rol)) {
        session.user.id = token.id;
        session.user.rol = token.rol;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
