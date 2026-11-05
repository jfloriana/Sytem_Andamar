// Semilla mínima de la fase 1: un usuario por rol y uno extra para la prueba de bloqueo.
// La semilla completa (600 clientes, pedidos, casos...) llega en la fase 5.
// Uso: SEED_PASSWORD=... npx prisma db seed   (la clave la defines tú; no hay valor por defecto)
import { Prisma, PrismaClient, type Rol } from "@prisma/client";
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
  // Fase 4: compraba cada 30 dias y dejo de comprar (aparece en riesgo y es segmento A tras recalcular).
  { documento: "20100000005", razonSocial: "Tienda Riesgo Muestra", direccion: "Av. Demo 505, Lima", telefono: "900000005", vendedor: "vendedor@andamar.test", contacto: { nombre: "Carla Demo", telefono: "900000055" } },
];

/** Prefijos de documentos que crean las pruebas E2E y la importación de muestra; se borran para poder repetir la suite. */
const PREFIJOS_DE_PRUEBA = ["E2E", "2099"];

/** Borra lo que cuelga de los clientes (sin cascada) para poder repetir la suite de pruebas. */
async function borrarDependientes(clientes: Prisma.ClienteWhereInput) {
  const donde = { cliente: clientes };
  await prisma.actividad.deleteMany({ where: donde });
  await prisma.pedido.deleteMany({ where: donde });
  await prisma.caso.deleteMany({ where: donde });
  await prisma.oportunidad.deleteMany({ where: donde });
  await prisma.solicitudTitular.deleteMany({ where: donde });
}

async function sembrarClientes() {
  const prefijos: Prisma.ClienteWhereInput = { OR: PREFIJOS_DE_PRUEBA.map((p) => ({ documento: { startsWith: p } })) };
  await borrarDependientes(prefijos);
  await prisma.cliente.deleteMany({ where: prefijos });
  for (const c of CLIENTES) {
    const vendedor = await prisma.usuario.findUniqueOrThrow({ where: { email: c.vendedor } });
    // El segmento vuelve a SIN_CLASIFICAR para que cada corrida parta del mismo punto (se recalcula en la fase 4).
    const datos = { razonSocial: c.razonSocial, direccion: c.direccion, telefono: c.telefono, vendedorId: vendedor.id, estado: "ACTIVO" as const, segmento: "SIN_CLASIFICAR" as const };
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

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const hace = (ms: number) => new Date(Date.now() - ms);
const enDias = (n: number) => new Date(Date.now() + n * DIA);

/** Oportunidades, actividades, pedidos y casos demo de la fase 3; se rehacen en cada corrida (idempotente). */
async function sembrarFase3() {
  const demo = { documento: { in: CLIENTES.map((c) => c.documento) } };
  await borrarDependientes(demo);
  await prisma.segmentoHistorico.deleteMany({ where: { cliente: demo } });

  const porDocumento = async (documento: string) => prisma.cliente.findUniqueOrThrow({ where: { documento } });
  const usuario = (email: string) => prisma.usuario.findUniqueOrThrow({ where: { email } });
  const [uno, dos, tres, cinco] = await Promise.all([porDocumento("20100000001"), porDocumento("20100000002"), porDocumento("20100000003"), porDocumento("20100000005")]);
  const [vendedor, ajeno, ejecutivo] = await Promise.all([usuario("vendedor@andamar.test"), usuario("bloqueo@andamar.test"), usuario("ejecutivo.servicio@andamar.test")]);

  const opp = (clienteId: string, vendedorId: string, titulo: string, etapa: "PROSPECTO" | "CONTACTADO" | "PROPUESTA" | "NEGOCIACION", montoEstimado: number) =>
    prisma.oportunidad.create({ data: { clienteId, vendedorId, titulo, etapa, montoEstimado, etapaCambiadaAt: hace(3 * DIA) } });
  await opp(uno.id, vendedor.id, "Demo: Pedido trimestral", "PROSPECTO", 5000);
  await opp(uno.id, vendedor.id, "Demo: Linea nueva", "PROPUESTA", 3200);
  await opp(dos.id, vendedor.id, "Demo: Reposicion de herramientas", "NEGOCIACION", 1800.5);
  await opp(tres.id, ajeno.id, "Demo: Oportunidad ajena", "CONTACTADO", 900);

  const tarea = (clienteId: string, resultado: string, recordatorioAt: Date) =>
    prisma.actividad.create({ data: { tipo: "TAREA", clienteId, usuarioId: vendedor.id, fecha: hace(2 * DIA), resultado, recordatorioAt, completada: false } });
  await tarea(uno.id, "Demo: llamar para confirmar entrega", hace(DIA));
  await tarea(dos.id, "Demo: enviar lista de precios", enDias(2));
  await prisma.actividad.create({
    data: { tipo: "VISITA", clienteId: uno.id, usuarioId: vendedor.id, fecha: hace(5 * DIA), resultado: "Demo: visita de presentacion", completada: true },
  });

  await prisma.pedido.create({ data: { clienteId: uno.id, vendedorId: vendedor.id, fecha: hace(20 * DIA), monto: 1200, margen: 180, estado: "ENTREGADO" } });
  await prisma.pedido.create({ data: { clienteId: uno.id, vendedorId: vendedor.id, fecha: hace(2 * DIA), monto: 800, margen: 120, estado: "REGISTRADO" } });
  await prisma.pedido.create({ data: { clienteId: uno.id, vendedorId: vendedor.id, fecha: hace(DIA), monto: 9999, margen: 999, estado: "ANULADO" } });

  // Fase 4: pedidos espaciados cada 30 dias que se cortaron hace mucho (riesgo). Margen total de la ventana: 1.200 (A) y 150 (C).
  for (const dias of [260, 230, 200, 170]) {
    await prisma.pedido.create({ data: { clienteId: cinco.id, vendedorId: vendedor.id, fecha: hace(dias * DIA), monto: 1500, margen: 300, estado: "ENTREGADO" } });
  }
  for (const dias of [300, 270, 240]) {
    await prisma.pedido.create({ data: { clienteId: tres.id, vendedorId: ajeno.id, fecha: hace(dias * DIA), monto: 400, margen: 50, estado: "ENTREGADO" } });
  }

  const caso = (titulo: string, apertura: Date, prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE") =>
    prisma.caso.create({
      data: {
        clienteId: uno.id,
        titulo,
        descripcion: "Caso de demostracion para pruebas.",
        prioridad,
        responsableId: ejecutivo.id,
        aperturaAt: apertura,
        fechaLimite: new Date(apertura.getTime() + 24 * HORA),
      },
    });
  await caso("Demo: Entrega incompleta", hace(48 * HORA), "ALTA"); // vencido sin primera respuesta: se ve ESCALADO
  await caso("Demo: Consulta de precios", hace(HORA), "BAJA"); // dentro del plazo
  console.log("Sembradas oportunidades, actividades, pedidos y casos demo.");
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
  await sembrarFase3();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
