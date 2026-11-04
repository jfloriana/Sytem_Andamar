import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { loginSchema } from "@/lib/validaciones/usuario";
import { estaBloqueado, registrarIntentoFallido, reiniciarIntentos } from "@/domain/bloqueo";
import { esRol } from "@/lib/roles";

export class CuentaBloqueada extends CredentialsSignin {
  code = "cuenta_bloqueada";
}

// Hash de relleno para que el tiempo de respuesta no delate si el correo existe.
let hashRelleno: string | undefined;
function relleno() {
  hashRelleno ??= bcrypt.hashSync("relleno-sin-uso", 10);
  return hashRelleno;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credenciales) {
        const datos = loginSchema.safeParse(credenciales);
        if (!datos.success) return null;
        const { email, password } = datos.data;
        const ahora = new Date();

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.activo) {
          await bcrypt.compare(password, relleno());
          return null;
        }
        if (estaBloqueado(usuario.bloqueadoHasta, ahora)) throw new CuentaBloqueada();

        const correcta = await bcrypt.compare(password, usuario.passwordHash);
        if (!correcta) {
          const r = registrarIntentoFallido(usuario, ahora);
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { intentosFallidos: r.intentosFallidos, bloqueadoHasta: r.bloqueadoHasta },
          });
          if (r.bloqueadoAhora) {
            await registrarAuditoria({
              usuarioId: usuario.id,
              accion: "BLOQUEO_CUENTA",
              entidad: "Usuario",
              entidadId: usuario.id,
              detalle: { bloqueadoHasta: r.bloqueadoHasta },
            });
            throw new CuentaBloqueada();
          }
          return null;
        }

        if (usuario.intentosFallidos !== 0 || usuario.bloqueadoHasta) {
          await prisma.usuario.update({ where: { id: usuario.id }, data: reiniciarIntentos() });
        }
        if (!esRol(usuario.rol)) return null;
        return { id: usuario.id, name: usuario.nombre, email: usuario.email, rol: usuario.rol };
      },
    }),
  ],
});
