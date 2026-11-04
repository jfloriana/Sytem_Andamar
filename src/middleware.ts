import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Las rutas /api/auth y /api/cron se protegen por su cuenta (Auth.js y CRON_SECRET).
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|privacidad).*)"],
};
