// Semilla mínima de la fase 1: un usuario por rol y uno extra para la prueba de bloqueo.
// La semilla completa (600 clientes, pedidos, casos...) llega en la fase 5.
// Uso: SEED_PASSWORD=... npx prisma db seed   (la clave la defines tú; no hay valor por defecto)
import { PrismaClient, type Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const USUARIOS: { nombre: string; email: string; rol: Rol }[] = [
  { nombre: "Admin Andamar", email: "admin@andamar.test", rol: "ADMIN" },
  { nombre: "Gerencia Andamar", email: "gerencia@andamar.test", rol: "GERENCIA" },
  { nombre: "Jefe de Ventas", email: "jefe.ventas@andamar.test", rol: "JEFE_VENTAS" },
  { nombre: "Vendedor Uno", email: "vendedor@andamar.test", rol: "VENDEDOR" },
  { nombre: "Jefe de Servicio", email: "jefe.servicio@andamar.test", rol: "JEFE_SERVICIO" },
  { nombre: "Ejecutivo de Servicio", email: "ejecutivo.servicio@andamar.test", rol: "EJECUTIVO_SERVICIO" },
  { nombre: "Usuario Bloqueo", email: "bloqueo@andamar.test", rol: "VENDEDOR" },
];

async function main() {
  const clave = process.env.SEED_PASSWORD;
  if (!clave || clave.length < 10) {
    throw new Error("Define SEED_PASSWORD (mínimo 10 caracteres) en el entorno antes de sembrar.");
  }
  const passwordHash = await bcrypt.hash(clave, 10);

  for (const u of USUARIOS) {
    // upsert restablece también el contador de bloqueo, útil entre corridas de E2E.
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { passwordHash, activo: true, intentosFallidos: 0, bloqueadoHasta: null, rol: u.rol },
      create: { ...u, passwordHash },
    });
  }

  const jefe = await prisma.usuario.findUniqueOrThrow({ where: { email: "jefe.ventas@andamar.test" } });
  await prisma.usuario.updateMany({
    where: { email: { in: ["vendedor@andamar.test", "bloqueo@andamar.test"] } },
    data: { jefeId: jefe.id },
  });
  console.log(`Sembrados ${USUARIOS.length} usuarios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
