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

// Clientes mínimos para las pruebas de la fase 2 (carteras de distintos vendedores). Datos inventados.
const CLIENTES: {
  documento: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  vendedor: string;
  contacto?: { nombre: string; telefono: string };
}[] = [
  { documento: "20100000001", razonSocial: "Distribuidora Demo Uno", direccion: "Av. Demo 101, Lima", telefono: "900000001", vendedor: "vendedor@andamar.test", contacto: { nombre: "Ana Demo", telefono: "900000011" } },
  { documento: "20100000002", razonSocial: "Ferreteria Demo Dos", direccion: "Jr. Demo 202, Lima", telefono: "900000002", vendedor: "vendedor@andamar.test" },
  { documento: "20100000003", razonSocial: "Panaderia Ajena Tres", direccion: "Calle Demo 303, Cusco", telefono: "900000003", vendedor: "bloqueo@andamar.test", contacto: { nombre: "Beto Demo", telefono: "900000033" } },
  { documento: "20100000004", razonSocial: "Libreria Ajena Cuatro", direccion: "Av. Demo 404, Arequipa", telefono: "900000004", vendedor: "bloqueo@andamar.test" },
];

/** Prefijos de documentos que crean las pruebas E2E y la importación de muestra; se borran para poder repetir la suite. */
const PREFIJOS_DE_PRUEBA = ["E2E", "2099"];

async function sembrarClientes() {
  await prisma.cliente.deleteMany({ where: { OR: PREFIJOS_DE_PRUEBA.map((p) => ({ documento: { startsWith: p } })) } });
  for (const c of CLIENTES) {
    const vendedor = await prisma.usuario.findUniqueOrThrow({ where: { email: c.vendedor } });
    const datos = { razonSocial: c.razonSocial, direccion: c.direccion, telefono: c.telefono, vendedorId: vendedor.id, estado: "ACTIVO" as const };
    const cliente = await prisma.cliente.upsert({
      where: { documento: c.documento },
      update: datos,
      create: { documento: c.documento, ...datos },
    });
    await prisma.contacto.deleteMany({ where: { clienteId: cliente.id } });
    if (c.contacto) await prisma.contacto.create({ data: { clienteId: cliente.id, ...c.contacto, principal: true } });
  }
  console.log(`Sembrados ${CLIENTES.length} clientes.`);
}

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
  await sembrarClientes();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
