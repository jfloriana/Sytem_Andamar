// Semilla completa de la fase 5 (sección 12 del spec): 21 usuarios, 600 clientes (con los 5 de demostración),
// 24 meses de pedidos, oportunidades, actividades, casos, consentimientos y solicitudes de titulares.
// Determinista (faker es + seed 42) y por lotes: la base es remota. Todos los datos son inventados.
// Lo sembrado aquí tiene ids con prefijo `seed-` y se borra y recrea en cada corrida (idempotente).
import { fakerES as faker } from "@faker-js/faker";
import type { Canal, Finalidad } from "../src/domain/consentimientos";
import { restarMeses } from "../src/domain/periodos";
import { evaluarRiesgo, resumirCompras } from "../src/domain/riesgo";
import { clasificarSegmento } from "../src/domain/segmentacion";
import { fechaLimiteSolicitud } from "../src/domain/solicitudes";
import type { Prisma, PrismaClient, Rol, Segmento } from "@prisma/client";

export const PREFIJO_ID = "seed-";
const PREFIJO_CLIENTE = "seed-cli-";
/** Documentos de los clientes generados (no usan los prefijos E2E ni 2099, que el seed borra). */
const PREFIJO_DOCUMENTO = "2020";

const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;

const TOTAL_BULK = 595; // + 5 clientes demo = 600
const POR_SEGMENTO = { A: 59, B: 239, C: 297 } as const;
const N_RIESGO = 40;
const N_NUEVOS = 30;
const N_OPORTUNIDADES = 400;
const N_GANADAS = 72; // 18 %
const N_PERDIDAS = 118;
const N_CASOS = 150;
const N_TAREAS_PENDIENTES = 75;
const PORCENTAJE_COMPLETOS = 0.55;
const USUARIOS_SIN_ACTIVIDAD_RECIENTE = ["vendedor15@andamar.test", "ejecutivo2@andamar.test"];

const rnd = (min: number, max: number) => faker.number.int({ min, max });
const frac = () => faker.number.float({ min: 0, max: 1, fractionDigits: 6 });
const pick = <T>(lista: readonly T[]): T => lista[rnd(0, lista.length - 1)];
const redondear = (n: number) => Math.round(n * 100) / 100;
const hacer = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

async function enLotes<T>(filas: T[], tamano: number, insertar: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < filas.length; i += tamano) await insertar(filas.slice(i, i + tamano));
}

const USUARIOS_BASE = [
  "admin@andamar.test",
  "gerencia@andamar.test",
  "jefe.ventas@andamar.test",
  "vendedor@andamar.test",
  "jefe.servicio@andamar.test",
  "ejecutivo.servicio@andamar.test",
  "bloqueo@andamar.test",
];

const USUARIOS_EXTRA: { email: string; rol: Rol }[] = [
  ...hacer(13, (i) => ({ email: `vendedor${String(i + 3).padStart(2, "0")}@andamar.test`, rol: "VENDEDOR" as Rol })),
  { email: "ejecutivo2@andamar.test", rol: "EJECUTIVO_SERVICIO" },
];

/** Usuarios adicionales hasta completar 21 (1 ADMIN, 1 GERENCIA, 1 JEFE_VENTAS, 15 VENDEDOR, 1 JEFE_SERVICIO, 2 EJECUTIVO_SERVICIO). */
export async function sembrarUsuariosExtra(prisma: PrismaClient, passwordHash: string) {
  faker.seed(4242);
  const jefe = await prisma.usuario.findUniqueOrThrow({ where: { email: "jefe.ventas@andamar.test" } });
  for (const u of USUARIOS_EXTRA) {
    const nombre = faker.person.fullName();
    const datos = { nombre, rol: u.rol, passwordHash, activo: true, intentosFallidos: 0, bloqueadoHasta: null, jefeId: u.rol === "VENDEDOR" ? jefe.id : null };
    await prisma.usuario.upsert({ where: { email: u.email }, update: datos, create: { email: u.email, ...datos } });
  }
}

async function borrarSembrado(prisma: PrismaClient) {
  const delCliente = { cliente: { id: { startsWith: PREFIJO_CLIENTE } } };
  await prisma.auditLog.deleteMany({ where: { entidadId: { startsWith: PREFIJO_ID } } });
  await prisma.actividad.deleteMany({ where: delCliente });
  await prisma.pedido.deleteMany({ where: delCliente });
  await prisma.caso.deleteMany({ where: delCliente });
  await prisma.oportunidad.deleteMany({ where: delCliente });
  await prisma.solicitudTitular.deleteMany({ where: delCliente });
  // Contactos, consentimientos e histórico de segmento se borran en cascada con el cliente.
  await prisma.cliente.deleteMany({ where: { id: { startsWith: PREFIJO_CLIENTE } } });
}

interface PedidoGen {
  clienteId: string;
  vendedorId: string;
  fecha: Date;
  monto: number;
  margen: number;
  estado: "REGISTRADO" | "ENTREGADO" | "ANULADO";
}

interface ClienteGen {
  id: string;
  vendedorId: string;
  segmentoObjetivo: "A" | "B" | "C";
  createdAt: Date;
  esNuevo: boolean;
  enRiesgo: boolean;
  completo: boolean;
}

const MARGEN_OBJETIVO = {
  A: () => rnd(1020, 2000),
  B: () => rnd(310, 700),
  C: () => rnd(30, 210),
} as const;
const PEDIDOS_POR_ANIO = { A: () => rnd(14, 24), B: () => rnd(7, 15), C: () => rnd(2, 7) } as const;

/** Reparte `total` en `n` partes positivas con pesos al azar; la suma es exacta al centavo. */
function repartir(total: number, n: number): number[] {
  const pesos = hacer(n, () => 0.6 + 0.8 * frac());
  const suma = pesos.reduce((s, p) => s + p, 0);
  const partes = pesos.map((p) => Math.max(0.01, redondear((total * p) / suma)));
  const resto = redondear(total - partes.reduce((s, p) => s + p, 0));
  partes[partes.length - 1] = Math.max(0.01, redondear(partes[partes.length - 1] + resto));
  return partes;
}

/** Fechas de pedidos: cada `intervalo` días hacia atrás desde hace `ultimoHace` días, con poca variación. */
function fechasRegulares(ahora: Date, ultimoHace: number, intervalo: number, cantidad: number, jitter: number): Date[] {
  return hacer(cantidad, (k) => {
    const dias = ultimoHace + k * intervalo + (k === 0 ? 0 : (frac() * 2 - 1) * jitter);
    return new Date(ahora.getTime() - Math.max(0.2, dias) * DIA);
  });
}

function generarPedidos(c: ClienteGen, ahora: Date): PedidoGen[] {
  const inicioVentana = restarMeses(ahora, 12).getTime();
  const objetivo = MARGEN_OBJETIVO[c.segmentoObjetivo]();
  let fechas: Date[];
  if (c.enRiesgo) {
    const intervalo = rnd(25, 45);
    const ultimoHace = Math.round(1.5 * intervalo) + rnd(15, 70);
    // Llega hasta 380-460 días atrás: así también estaba activo al inicio del período y la retención es coherente.
    const cantidad = Math.ceil((rnd(380, 460) - ultimoHace) / intervalo) + 1;
    fechas = fechasRegulares(ahora, ultimoHace, intervalo, cantidad, 3);
  } else {
    const nAnio = PEDIDOS_POR_ANIO[c.segmentoObjetivo]();
    const intervalo = 355 / nAnio;
    let mejor: Date[] = [];
    // Se reduce la recencia hasta que la regla de riesgo (la misma del sistema) no lo marque.
    for (let recencia = 0.8; recencia >= 0; recencia -= 0.4) {
      const ultimoHace = Math.max(0.5, frac() * intervalo * recencia);
      const recientes = fechasRegulares(ahora, ultimoHace, intervalo, nAnio, intervalo * 0.2).filter((f) => f.getTime() > inicioVentana + DIA);
      const previos = c.esNuevo
        ? []
        : fechasRegulares(ahora, 372 + frac() * intervalo, intervalo, Math.max(1, Math.round(nAnio * (0.7 + 0.4 * frac()))), intervalo * 0.2);
      mejor = [...recientes, ...previos].filter((f) => f.getTime() > c.createdAt.getTime());
      const r = evaluarRiesgo(resumirCompras(mejor), ahora);
      if (!r.enRiesgo && mejor.some((f) => f.getTime() >= inicioVentana)) break;
    }
    fechas = mejor;
  }
  fechas = fechas.filter((f) => f.getTime() > c.createdAt.getTime() && f.getTime() < ahora.getTime()).sort((a, b) => a.getTime() - b.getTime());
  // Todo cliente generado tiene al menos un pedido en la ventana (así queda en A, B o C).
  if (!fechas.some((f) => f.getTime() >= inicioVentana)) {
    const desde = Math.max(c.createdAt.getTime(), inicioVentana + DIA);
    fechas.push(new Date(desde + frac() * (ahora.getTime() - DIA - desde)));
    fechas.sort((a, b) => a.getTime() - b.getTime());
  }
  const enVentana = fechas.filter((f) => f.getTime() >= inicioVentana);
  const margenes = repartir(objetivo, Math.max(1, enVentana.length));
  const promedio = objetivo / Math.max(1, enVentana.length);
  let iVentana = 0;
  const pedidos = fechas.map((fecha): PedidoGen => {
    const dentro = fecha.getTime() >= inicioVentana;
    const margen = dentro ? margenes[iVentana++] : Math.max(0.01, redondear(promedio * (0.7 + 0.6 * frac())));
    const monto = Math.max(margen, redondear(margen / (0.12 + 0.1 * frac())));
    const reciente = ahora.getTime() - fecha.getTime() < 5 * DIA;
    return { clienteId: c.id, vendedorId: c.vendedorId, fecha, monto, margen, estado: reciente ? "REGISTRADO" : "ENTREGADO" };
  });
  // Un pedido anulado adicional en el 2 % de los clientes: no cuenta para nada (regla 1).
  if (pedidos.length > 0 && frac() < 0.02) {
    pedidos.push({ clienteId: c.id, vendedorId: c.vendedorId, fecha: new Date(ahora.getTime() - rnd(10, 200) * DIA), monto: rnd(200, 900), margen: rnd(30, 150), estado: "ANULADO" });
  }
  return pedidos;
}

const MOTIVOS_PERDIDA = ["Precio más alto que la competencia", "Compró a otro proveedor", "Sin presupuesto este trimestre", "Cambió de giro de negocio", "No respondió a las propuestas"];
const RESULTADOS = ["Cliente interesado en la nueva línea", "Pidió una lista de precios", "Quedó en confirmar el pedido", "Revisó el stock del almacén", "Solicitó una muestra de producto", "Sin novedades, se volverá a llamar"];
const TAREAS = ["Llamar para confirmar la entrega", "Enviar lista de precios actualizada", "Visitar el local para revisar el stock", "Confirmar la fecha de pago", "Presentar la promoción del mes"];
const TITULOS_CASO = ["Entrega incompleta", "Producto dañado", "Factura con error de monto", "Retraso en la entrega", "Consulta por devolución", "Reclamo por precio distinto", "Falta de producto en el pedido"];

export interface ResumenSembrado {
  clientes: number;
  pedidos: number;
  oportunidades: number;
  actividades: number;
  casos: number;
  consentimientos: number;
  solicitudes: number;
  historico: number;
  auditoria: number;
}

/** Siembra el volumen completo. Requiere los usuarios ya creados (incluidos los extra). */
export async function sembrarVolumen(prisma: PrismaClient): Promise<ResumenSembrado> {
  faker.seed(42);
  const ahora = new Date();
  await borrarSembrado(prisma);

  // Solo los 21 usuarios de la semilla (las pruebas E2E crean otros que no cuentan aquí).
  const emailsSemilla = new Set([...USUARIOS_BASE, ...USUARIOS_EXTRA.map((u) => u.email)]);
  const usuarios = (await prisma.usuario.findMany({ select: { id: true, email: true, rol: true } })).filter((u) => emailsSemilla.has(u.email));
  const vendedores = usuarios.filter((u) => u.rol === "VENDEDOR").sort((a, b) => a.email.localeCompare(b.email));
  const ejecutivos = usuarios.filter((u) => u.rol === "EJECUTIVO_SERVICIO").sort((a, b) => a.email.localeCompare(b.email));
  if (vendedores.length !== 15 || ejecutivos.length !== 2) throw new Error("Se esperaban 15 vendedores y 2 ejecutivos de servicio.");

  // ---- Clientes ----
  const etiquetas = faker.helpers.shuffle([
    ...hacer(POR_SEGMENTO.A, () => "A" as const),
    ...hacer(POR_SEGMENTO.B, () => "B" as const),
    ...hacer(POR_SEGMENTO.C, () => "C" as const),
  ]);
  if (etiquetas.length !== TOTAL_BULK) throw new Error("La suma de segmentos no da el total de clientes.");
  const idxRiesgo = new Set(faker.helpers.shuffle(hacer(TOTAL_BULK, (i) => i)).slice(0, N_RIESGO));
  const idxNuevos = new Set(faker.helpers.shuffle(hacer(TOTAL_BULK, (i) => i).filter((i) => !idxRiesgo.has(i))).slice(0, N_NUEVOS));
  const idxCompletos = new Set(faker.helpers.shuffle(hacer(TOTAL_BULK, (i) => i)).slice(0, Math.round(TOTAL_BULK * PORCENTAJE_COMPLETOS)));
  const nombresUsados = new Set<string>();
  const telefonosUsados = new Set<string>();
  const unico = (generar: () => string, usados: Set<string>) => {
    for (let i = 0; i < 200; i++) {
      const v = generar();
      if (!usados.has(v.toLowerCase())) {
        usados.add(v.toLowerCase());
        return v;
      }
    }
    throw new Error("No se pudo generar un valor único.");
  };

  const gen: ClienteGen[] = [];
  const clientesFilas: Prisma.ClienteCreateManyInput[] = [];
  const contactosFilas: Prisma.ContactoCreateManyInput[] = [];
  for (let i = 0; i < TOTAL_BULK; i++) {
    const id = `${PREFIJO_CLIENTE}${String(i + 1).padStart(4, "0")}`;
    const vendedor = vendedores[i % vendedores.length];
    const esNuevo = idxNuevos.has(i);
    const enRiesgo = idxRiesgo.has(i);
    const createdAt = new Date(ahora.getTime() - (esNuevo ? rnd(60, 330) : rnd(740, 1100)) * DIA);
    const g: ClienteGen = { id, vendedorId: vendedor.id, segmentoObjetivo: etiquetas[i], createdAt, esNuevo, enRiesgo, completo: idxCompletos.has(i) };
    gen.push(g);
    const razonSocial = unico(() => `${faker.company.name()}${pick(["", " S.A.C.", " E.I.R.L.", " S.R.L."])}`, nombresUsados);
    const telefono = unico(() => "9" + faker.string.numeric(8), telefonosUsados);
    clientesFilas.push({
      id,
      documento: `${PREFIJO_DOCUMENTO}${String(i + 1).padStart(7, "0")}`,
      razonSocial,
      direccion: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      telefono,
      email: frac() < 0.6 ? `contacto${i + 1}@${faker.internet.domainName()}` : null,
      vendedorId: vendedor.id,
      createdAt,
      updatedAt: createdAt,
    });
    // Completo = contacto principal con teléfono o correo. El resto: sin contacto, o con contacto sin medio de contacto.
    if (g.completo) {
      const conTelefono = frac() < 0.85;
      contactosFilas.push({
        clienteId: id,
        nombre: faker.person.fullName(),
        cargo: pick(["Propietario", "Administrador", "Encargado de compras", "Gerente"]),
        telefono: conTelefono ? "9" + faker.string.numeric(8) : null,
        email: conTelefono ? null : `compras${i + 1}@${faker.internet.domainName()}`,
        principal: true,
        createdAt,
        updatedAt: createdAt,
      });
    } else if (frac() < 0.35) {
      contactosFilas.push({ clienteId: id, nombre: faker.person.fullName(), cargo: "Encargado", telefono: null, email: null, principal: true, createdAt, updatedAt: createdAt });
    }
    if (frac() < 0.2) {
      contactosFilas.push({ clienteId: id, nombre: faker.person.fullName(), cargo: "Almacén", telefono: "9" + faker.string.numeric(8), email: null, principal: false, createdAt, updatedAt: createdAt });
    }
  }

  // ---- Pedidos (24 meses) ----
  const pedidos = gen.flatMap((c) => generarPedidos(c, ahora));
  const validosPorCliente = new Map<string, PedidoGen[]>();
  for (const p of pedidos) if (p.estado !== "ANULADO") (validosPorCliente.get(p.clienteId) ?? validosPorCliente.set(p.clienteId, []).get(p.clienteId)!).push(p);
  for (const f of clientesFilas) {
    const compras = validosPorCliente.get(f.id as string) ?? [];
    const inicio = restarMeses(ahora, 12).getTime();
    const ventana = compras.filter((p) => p.fecha.getTime() >= inicio);
    const margen = ventana.reduce((s, p) => s + Math.round(p.margen * 100), 0) / 100;
    f.segmento = clasificarSegmento(margen, ventana.length) as Segmento;
    const riesgo = evaluarRiesgo(resumirCompras(compras.map((p) => p.fecha)), ahora).enRiesgo;
    f.estado = riesgo ? "EN_RIESGO" : "ACTIVO";
  }

  // ---- Oportunidades y actividades ----
  const etapasAbiertas = [...hacer(70, () => "PROSPECTO" as const), ...hacer(60, () => "CONTACTADO" as const), ...hacer(45, () => "PROPUESTA" as const), ...hacer(35, () => "NEGOCIACION" as const)];
  const resultados = faker.helpers.shuffle([
    ...hacer(N_GANADAS, () => "GANADA" as const),
    ...hacer(N_PERDIDAS, () => "PERDIDA" as const),
    ...hacer(N_OPORTUNIDADES - N_GANADAS - N_PERDIDAS, (i) => etapasAbiertas[i % etapasAbiertas.length]),
  ]);
  const oportunidades: Prisma.OportunidadCreateManyInput[] = [];
  const actividades: Prisma.ActividadCreateManyInput[] = [];
  const nuevaActividad = (clienteId: string, usuarioId: string, fecha: Date, oportunidadId: string | null) =>
    actividades.push({
      id: `${PREFIJO_ID}act-${String(actividades.length + 1).padStart(5, "0")}`,
      tipo: pick(["VISITA", "LLAMADA", "MENSAJE"] as const),
      clienteId,
      oportunidadId,
      usuarioId,
      fecha,
      resultado: pick(RESULTADOS),
      completada: true,
      createdAt: fecha,
      updatedAt: fecha,
    });
  resultados.forEach((etapa, i) => {
    const c = gen[rnd(0, gen.length - 1)];
    const cerrada = etapa === "GANADA" || etapa === "PERDIDA";
    const creadaAt = new Date(ahora.getTime() - (cerrada ? rnd(10, 360) : rnd(3, 360)) * DIA);
    const cerradaAt = cerrada ? new Date(Math.min(creadaAt.getTime() + rnd(7, 60) * DIA, ahora.getTime() - DIA)) : null;
    const etapaCambiadaAt = cerradaAt ?? new Date(creadaAt.getTime() + frac() * (ahora.getTime() - creadaAt.getTime()));
    const id = `${PREFIJO_ID}opp-${String(i + 1).padStart(4, "0")}`;
    oportunidades.push({
      id,
      clienteId: c.id,
      vendedorId: c.vendedorId,
      titulo: `${pick(["Reposición de", "Línea nueva de", "Pedido trimestral de", "Promoción de"])} ${faker.commerce.product().toLowerCase()}`,
      etapa,
      montoEstimado: rnd(300, 6000),
      motivoPerdida: etapa === "PERDIDA" ? pick(MOTIVOS_PERDIDA) : null,
      cerradaAt,
      etapaCambiadaAt,
      createdAt: creadaAt,
      updatedAt: etapaCambiadaAt,
    });
    const hasta = (cerradaAt ?? ahora).getTime();
    for (let k = rnd(1, 3); k > 0; k--) nuevaActividad(c.id, c.vendedorId, new Date(creadaAt.getTime() + frac() * (hasta - creadaAt.getTime())), id);
    // Una abierta de cada dos tiene una actividad posterior al último cambio de etapa: puede avanzar.
    if (!cerrada && i % 2 === 0) nuevaActividad(c.id, c.vendedorId, new Date(etapaCambiadaAt.getTime() + HORA), id);
  });
  for (const c of gen) for (let k = rnd(0, 3); k > 0; k--) nuevaActividad(c.id, c.vendedorId, new Date(ahora.getTime() - rnd(1, 360) * DIA), null);
  for (let k = 0; k < N_TAREAS_PENDIENTES; k++) {
    const c = gen[rnd(0, gen.length - 1)];
    const vencida = frac() < 0.4;
    const fecha = new Date(ahora.getTime() - rnd(0, 5) * DIA);
    actividades.push({
      id: `${PREFIJO_ID}act-t${String(k + 1).padStart(4, "0")}`,
      tipo: "TAREA",
      clienteId: c.id,
      usuarioId: c.vendedorId,
      fecha,
      resultado: pick(TAREAS),
      recordatorioAt: new Date(ahora.getTime() + (vencida ? -rnd(1, 72) : rnd(2, 120)) * HORA),
      completada: false,
      createdAt: fecha,
      updatedAt: fecha,
    });
  }

  // ---- Casos ----
  const casos: Prisma.CasoCreateManyInput[] = [];
  const nuevoCaso = (i: number, clienteId: string, apertura: Date, parcial: Partial<Prisma.CasoCreateManyInput>) => {
    casos.push({
      id: `${PREFIJO_ID}caso-${String(i).padStart(4, "0")}`,
      clienteId,
      titulo: pick(TITULOS_CASO),
      descripcion: "Caso de demostración generado por la semilla.",
      prioridad: pick(["BAJA", "MEDIA", "MEDIA", "ALTA", "URGENTE"] as const),
      responsableId: ejecutivos[i % 2].id,
      aperturaAt: apertura,
      fechaLimite: new Date(apertura.getTime() + 24 * HORA),
      createdAt: apertura,
      updatedAt: apertura,
      ...parcial,
    });
  };
  for (let i = 1; i <= N_CASOS - 20; i++) {
    const apertura = new Date(ahora.getTime() - rnd(3, 360) * DIA - rnd(0, 23) * HORA);
    const primerContacto = frac() < 0.75;
    const demora = (frac() < 0.88 ? 0.5 + 19.5 * frac() : 26 + 34 * frac()) * HORA;
    const primeraRespuestaAt = new Date(apertura.getTime() + demora);
    const resueltoAt = primerContacto ? primeraRespuestaAt : new Date(primeraRespuestaAt.getTime() + rnd(2, 72) * HORA);
    nuevoCaso(i, gen[rnd(0, gen.length - 1)].id, apertura, {
      estado: frac() < 0.6 ? "CERRADO" : "RESUELTO",
      primeraRespuestaAt,
      resueltoAt,
      resueltoPrimerContacto: primerContacto,
      updatedAt: resueltoAt,
    });
  }
  // 12 abiertos dentro del plazo y 8 escalados; siempre más recientes que el caso vencido de demostración.
  for (let i = N_CASOS - 19; i <= N_CASOS - 8; i++) {
    const apertura = new Date(ahora.getTime() - rnd(1, 20) * HORA);
    const enProceso = i % 2 === 0;
    nuevoCaso(i, gen[rnd(0, gen.length - 1)].id, apertura, enProceso ? { estado: "EN_PROCESO", primeraRespuestaAt: new Date(apertura.getTime() + 30 * 60 * 1000) } : { estado: "ABIERTO" });
  }
  for (let i = N_CASOS - 7; i <= N_CASOS; i++) {
    nuevoCaso(i, gen[rnd(0, gen.length - 1)].id, new Date(ahora.getTime() - rnd(30, 40) * HORA), { estado: "ESCALADO" });
  }

  // ---- Consentimientos ----
  const consentimientos: Prisma.ConsentimientoCreateManyInput[] = [];
  const otorgar = (clienteId: string, finalidad: Finalidad, canal: Canal, desde: Date, retirar: boolean) => {
    const otorgadoAt = new Date(desde.getTime() + frac() * (ahora.getTime() - desde.getTime() - 5 * DIA));
    const retiradoAt = retirar ? new Date(otorgadoAt.getTime() + frac() * (ahora.getTime() - otorgadoAt.getTime())) : null;
    consentimientos.push({ clienteId, finalidad, canal, otorgadoAt, retiradoAt, createdAt: otorgadoAt, updatedAt: retiradoAt ?? otorgadoAt });
  };
  for (const c of gen) {
    if (frac() < 0.95) otorgar(c.id, "SERVICIO", pick(["TELEFONO", "PRESENCIAL"] as const), c.createdAt, false);
    if (frac() < 0.6) otorgar(c.id, "PROMOCIONES", pick(["EMAIL", "WHATSAPP", "TELEFONO"] as const), c.createdAt, frac() < 0.12);
    if (frac() < 0.35) otorgar(c.id, "ANALITICA", pick(["EMAIL", "PRESENCIAL"] as const), c.createdAt, frac() < 0.08);
  }

  // ---- Solicitudes de titulares ----
  const solicitudes: Prisma.SolicitudTitularCreateManyInput[] = [];
  const haceDias = (n: number) => new Date(ahora.getTime() - n * DIA);
  const agregarSolicitud = (i: number, tipo: "ACCESO" | "RECTIFICACION" | "SUPRESION", estado: "PENDIENTE" | "EN_PROCESO" | "ATENDIDA" | "RECHAZADA", solicitadaAt: Date, extra: Partial<Prisma.SolicitudTitularCreateManyInput> = {}) =>
    solicitudes.push({ id: `${PREFIJO_ID}sol-${i}`, clienteId: gen[7 + i * 41].id, tipo, estado, solicitadaAt, createdAt: solicitadaAt, updatedAt: solicitadaAt, ...extra });
  agregarSolicitud(1, "ACCESO", "ATENDIDA", haceDias(25), { atendidaAt: haceDias(22), resolucion: "Se entregó el reporte de datos del titular." });
  agregarSolicitud(2, "ACCESO", "ATENDIDA", haceDias(40), { atendidaAt: haceDias(33), resolucion: "Se entregó el reporte de datos del titular." });
  agregarSolicitud(3, "RECTIFICACION", "EN_PROCESO", haceDias(4), { detalle: "Corregir el teléfono de contacto." });
  agregarSolicitud(4, "SUPRESION", "PENDIENTE", haceDias(2), { detalle: "Pide eliminar sus datos personales." });
  agregarSolicitud(5, "ACCESO", "PENDIENTE", haceDias(22), { detalle: "Pide copia de sus datos." }); // vencida
  agregarSolicitud(6, "RECTIFICACION", "RECHAZADA", haceDias(30), { atendidaAt: haceDias(28), resolucion: "No se acreditó la identidad del titular." });
  // Una por vencer: el plazo termina en unas 24 horas (se busca la hora de registro que lo cumple).
  for (let h = 0; h < 24 * 20; h++) {
    const solicitadaAt = new Date(ahora.getTime() - h * HORA);
    const falta = fechaLimiteSolicitud(solicitadaAt, "ACCESO").getTime() - ahora.getTime();
    if (falta > 12 * HORA && falta < 36 * HORA) {
      agregarSolicitud(7, "ACCESO", "PENDIENTE", solicitadaAt, { detalle: "Pide copia de sus datos." });
      break;
    }
  }

  // ---- Auditoría: 2 acciones de escritura por usuario y mes (6 meses); dos usuarios sin actividad en los últimos 30 días ----
  const auditoria: Prisma.AuditLogCreateManyInput[] = [];
  const ACCIONES = [["CREAR_ACTIVIDAD", "Actividad"], ["CREAR_PEDIDO", "Pedido"], ["ACTUALIZAR_CLIENTE", "Cliente"], ["CREAR_OPORTUNIDAD", "Oportunidad"], ["RESPONDER_CASO", "Caso"]] as const;
  const dormidos = new Set(usuarios.filter((u) => USUARIOS_SIN_ACTIVIDAD_RECIENTE.includes(u.email)).map((u) => u.id));
  for (const u of usuarios) {
    for (let mes = 0; mes < 6; mes++) {
      for (let k = 0; k < 2; k++) {
        const dias = mes === 0 ? rnd(1, 28) : mes * 30 + rnd(0, 29);
        if (dormidos.has(u.id) && dias < 35) continue;
        const [accion, entidad] = pick(ACCIONES);
        const createdAt = new Date(ahora.getTime() - dias * DIA - rnd(0, 20) * HORA);
        auditoria.push({ id: `${PREFIJO_ID}aud-${String(auditoria.length + 1).padStart(4, "0")}`, usuarioId: u.id, accion, entidad, entidadId: `${PREFIJO_ID}aud-ref-${auditoria.length + 1}`, detalle: { origen: "semilla" }, createdAt, updatedAt: createdAt });
      }
    }
  }

  // ---- Histórico de segmento de los 5 meses anteriores (el actual lo genera el recálculo) ----
  const historico: Prisma.SegmentoHistoricoCreateManyInput[] = [];
  for (let m = 1; m <= 5; m++) {
    const mes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - m, 1));
    const desde = restarMeses(mes, 12).getTime();
    for (const c of gen) {
      const ventana = (validosPorCliente.get(c.id) ?? []).filter((p) => p.fecha.getTime() >= desde && p.fecha.getTime() < mes.getTime());
      const margen = ventana.reduce((s, p) => s + Math.round(p.margen * 100), 0) / 100;
      historico.push({ clienteId: c.id, mes, segmento: clasificarSegmento(margen, ventana.length) as Segmento, margenAnual: margen });
    }
  }

  // ---- Escritura por lotes (orden por dependencias) ----
  await enLotes(clientesFilas, 1000, (d) => prisma.cliente.createMany({ data: d }));
  await enLotes(contactosFilas, 1000, (d) => prisma.contacto.createMany({ data: d }));
  await enLotes(consentimientos, 1000, (d) => prisma.consentimiento.createMany({ data: d }));
  await enLotes(oportunidades, 1000, (d) => prisma.oportunidad.createMany({ data: d }));
  await enLotes(pedidos, 2500, (d) => prisma.pedido.createMany({ data: d }));
  await enLotes(actividades, 2500, (d) => prisma.actividad.createMany({ data: d }));
  await enLotes(casos, 1000, (d) => prisma.caso.createMany({ data: d }));
  await enLotes(solicitudes, 1000, (d) => prisma.solicitudTitular.createMany({ data: d }));
  await enLotes(auditoria, 1000, (d) => prisma.auditLog.createMany({ data: d }));
  await enLotes(historico, 2500, (d) => prisma.segmentoHistorico.createMany({ data: d }));

  return {
    clientes: clientesFilas.length,
    pedidos: pedidos.length,
    oportunidades: oportunidades.length,
    actividades: actividades.length,
    casos: casos.length,
    consentimientos: consentimientos.length,
    solicitudes: solicitudes.length,
    historico: historico.length,
    auditoria: auditoria.length,
  };
}
