// Verifica los seis indicadores del tablero: los recalcula de forma independiente (SQL directo sobre los datos
// crudos, sin las funciones del dominio) y los compara con el cálculo del tablero (`src/lib/tablero.ts`).
// Además revisa una muestra de 30 clientes (segmento, margen de 12 meses y estado de riesgo) y la distribución por segmento.
// Uso: npm run verificar:indicadores   (usa DATABASE_URL del .env; solo lee, no escribe). Sale con código 1 si hay diferencias.
import { PrismaClient } from "@prisma/client";
import { calcularClv } from "../src/domain/clv";
import { calcularTablero } from "../src/lib/tablero";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env: se usa solo el entorno
}

const DIA = 24 * 60 * 60 * 1000;
const prisma = new PrismaClient();

/** Resta meses de calendario en UTC (implementación propia, distinta de la del sistema). */
function menosMeses(fecha: Date, meses: number): Date {
  const y = fecha.getUTCFullYear();
  const m = fecha.getUTCMonth() - meses;
  const ultimoDiaDelMes = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(fecha.getUTCDate(), ultimoDiaDelMes), fecha.getUTCHours(), fecha.getUTCMinutes(), fecha.getUTCSeconds(), fecha.getUTCMilliseconds()));
}

const pct = (a: number, b: number): number | null => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
const num = (v: unknown) => Number(v ?? 0);

interface Fila {
  indicador: string;
  independiente: number | null;
  tablero: number | null;
  ok: boolean;
}
const filas: Fila[] = [];
let diferencias = 0;

function comparar(indicador: string, independiente: number | null, tablero: number | null, tolerancia = 0.05) {
  const ok = independiente === null || tablero === null ? independiente === tablero : Math.abs(independiente - tablero) <= tolerancia;
  if (!ok) diferencias++;
  filas.push({ indicador, independiente, tablero, ok });
}

async function main() {
  const ahora = new Date();
  const hasta = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const hastaExcl = new Date(hasta.getTime() + DIA);
  const desde = menosMeses(hastaExcl, 12);

  const admin = await prisma.usuario.findFirstOrThrow({ where: { rol: "ADMIN", activo: true }, select: { id: true, nombre: true, email: true, rol: true } });
  const tablero = await calcularTablero({ id: admin.id, nombre: admin.nombre, email: admin.email, rol: "ADMIN" }, { desde, hasta, hastaExcl }, ahora);
  const tarjeta = (clave: string) => tablero.tarjetas.find((t) => t.clave === clave)!;

  // 1. Retención: (activos al final - nuevos) / activos al inicio.
  const [ret] = await prisma.$queryRaw<{ inicio: bigint; fin: bigint; nuevos: bigint }[]>`
    SELECT
      count(*) FILTER (WHERE act_ini) AS inicio,
      count(*) FILTER (WHERE act_fin) AS fin,
      count(*) FILTER (WHERE act_fin AND "createdAt" >= ${desde} AND "createdAt" < ${hastaExcl}) AS nuevos
    FROM (
      SELECT c.id, c."createdAt",
        EXISTS (SELECT 1 FROM "Pedido" p WHERE p."clienteId" = c.id AND p.estado <> 'ANULADO' AND p.fecha >= ${menosMeses(desde, 12)} AND p.fecha < ${desde}) AS act_ini,
        EXISTS (SELECT 1 FROM "Pedido" p WHERE p."clienteId" = c.id AND p.estado <> 'ANULADO' AND p.fecha >= ${menosMeses(hastaExcl, 12)} AND p.fecha < ${hastaExcl}) AS act_fin
      FROM "Cliente" c
    ) t`;
  comparar("1. Retención (%)", pct(num(ret.fin) - num(ret.nuevos), num(ret.inicio)), tarjeta("retencion").valor);

  // 2. Conversión: ganadas cerradas en el período / creadas en el período.
  const [conv] = await prisma.$queryRaw<{ creadas: bigint; ganadas: bigint }[]>`
    SELECT
      count(*) FILTER (WHERE "createdAt" >= ${desde} AND "createdAt" < ${hastaExcl}) AS creadas,
      count(*) FILTER (WHERE etapa = 'GANADA' AND "cerradaAt" >= ${desde} AND "cerradaAt" < ${hastaExcl}) AS ganadas
    FROM "Oportunidad"`;
  comparar("2. Conversión (%)", pct(num(conv.ganadas), num(conv.creadas)), tarjeta("conversion").valor);

  // 3. Resolución en primer contacto.
  const [pc] = await prisma.$queryRaw<{ total: bigint; primer: bigint }[]>`
    SELECT count(*) AS total, count(*) FILTER (WHERE "resueltoPrimerContacto") AS primer
    FROM "Caso"
    WHERE estado IN ('RESUELTO', 'CERRADO') AND "resueltoAt" >= ${desde} AND "resueltoAt" < ${hastaExcl}`;
  comparar("3. Primer contacto (%)", pct(num(pc.primer), num(pc.total)), tarjeta("primerContacto").valor);

  // 4. Tiempo medio de respuesta (horas) y porcentaje dentro del SLA.
  const [tr] = await prisma.$queryRaw<{ muestra: bigint; horas: number | null; en_sla: bigint }[]>`
    SELECT count(*) AS muestra,
      avg(extract(epoch FROM ("primeraRespuestaAt" - "aperturaAt")) / 3600.0)::float8 AS horas,
      count(*) FILTER (WHERE "primeraRespuestaAt" <= "fechaLimite") AS en_sla
    FROM "Caso"
    WHERE "primeraRespuestaAt" IS NOT NULL AND "aperturaAt" >= ${desde} AND "aperturaAt" < ${hastaExcl}`;
  comparar("4. Tiempo de respuesta (h)", tr.horas === null ? null : Math.round(tr.horas * 100) / 100, tarjeta("tiempoRespuesta").valor, 0.011);
  const detalleTr = tarjeta("tiempoRespuesta").detalle;
  const slaTablero = /(\d+(?:[.,]\d+)?) % dentro/.exec(detalleTr)?.[1];
  comparar("4b. Dentro del SLA (%)", pct(num(tr.en_sla), num(tr.muestra)), slaTablero === undefined ? null : Number(slaTablero.replace(",", ".")));

  // 5. Completitud: clientes completos / clientes no dados de baja.
  const [comp] = await prisma.$queryRaw<{ vigentes: bigint; completos: bigint }[]>`
    SELECT count(*) AS vigentes,
      count(*) FILTER (WHERE btrim(c.documento) <> '' AND btrim(c."razonSocial") <> '' AND btrim(c.direccion) <> '' AND c."vendedorId" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "Contacto" k WHERE k."clienteId" = c.id AND k.principal
          AND (btrim(coalesce(k.telefono, '')) <> '' OR btrim(coalesce(k.email, '')) <> ''))) AS completos
    FROM "Cliente" c WHERE c.estado <> 'INACTIVO'`;
  comparar("5. Completitud (%)", pct(num(comp.completos), num(comp.vigentes)), tarjeta("completitud").valor);

  // 6. Usuarios activos: con alguna escritura (auditoría) en los 30 días previos al fin del período.
  const [ua] = await prisma.$queryRaw<{ activos: bigint; con: bigint }[]>`
    SELECT count(*) AS activos,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."usuarioId" = u.id
        AND a."createdAt" >= ${new Date(hastaExcl.getTime() - 30 * DIA)} AND a."createdAt" < ${hastaExcl})) AS con
    FROM "Usuario" u WHERE u.activo`;
  comparar("6. Usuarios activos (%)", pct(num(ua.con), num(ua.activos)), tarjeta("usuariosActivos").valor);

  // Distribución por segmento (clientes no dados de baja).
  const grupos = await prisma.$queryRaw<{ segmento: string; n: bigint }[]>`SELECT segmento::text AS segmento, count(*) AS n FROM "Cliente" WHERE estado <> 'INACTIVO' GROUP BY segmento`;
  for (const d of tablero.distribucion) {
    comparar(`Distribución ${d.segmento}`, num(grupos.find((g) => g.segmento === d.segmento)?.n), d.clientes, 0);
  }

  console.log(`Período: ${desde.toISOString().slice(0, 10)} a ${hasta.toISOString().slice(0, 10)} (UTC)`);
  console.log("");
  console.log("Indicador".padEnd(30) + "Independiente".padStart(15) + "Tablero".padStart(12) + "  Resultado");
  for (const f of filas) {
    console.log(f.indicador.padEnd(30) + String(f.independiente ?? "sin datos").padStart(15) + String(f.tablero ?? "sin datos").padStart(12) + `  ${f.ok ? "coincide" : "DIFERENCIA"}`);
  }

  // Muestra de 30 clientes: segmento, margen de 12 meses, estado de riesgo y CLV contra lo guardado.
  const ids = (await prisma.cliente.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((c) => c.id);
  const paso = Math.max(1, Math.floor(ids.length / 30));
  const muestra = ids.filter((_, i) => i % paso === 0).slice(0, 30);
  const clientes = await prisma.cliente.findMany({ where: { id: { in: muestra } }, select: { id: true, documento: true, segmento: true, estado: true } });
  const inicioVentana = menosMeses(ahora, 12);
  let malos = 0;
  console.log("");
  console.log(`Muestra de ${clientes.length} clientes (segmento, margen 12 meses, riesgo, CLV)`);
  for (const c of clientes) {
    const pedidos = await prisma.pedido.findMany({ where: { clienteId: c.id, estado: { not: "ANULADO" } }, select: { fecha: true, margen: true }, orderBy: { fecha: "asc" } });
    const ventana = pedidos.filter((p) => p.fecha >= inicioVentana);
    const centavos = ventana.reduce((s, p) => s + Math.round(Number(p.margen) * 100), 0);
    const margen = centavos / 100;
    const segmentoEsperado = ventana.length === 0 ? "SIN_CLASIFICAR" : margen >= 1000 ? "A" : margen >= 300 ? "B" : "C";
    let enRiesgo = false;
    if (pedidos.length >= 3) {
      const intervalo = (pedidos[pedidos.length - 1].fecha.getTime() - pedidos[0].fecha.getTime()) / DIA / (pedidos.length - 1);
      enRiesgo = (ahora.getTime() - pedidos[pedidos.length - 1].fecha.getTime()) / DIA > Math.max(30, 1.5 * intervalo);
    }
    const estadoEsperado = c.estado === "INACTIVO" ? "INACTIVO" : enRiesgo ? "EN_RIESGO" : "ACTIVO";
    const clvIndependiente = (margen * 0.78) / (1 + 0.1 - 0.78);
    const clvSistema = calcularClv(margen, 0.78);
    const bien = segmentoEsperado === c.segmento && estadoEsperado === c.estado && clvSistema !== null && Math.abs(clvSistema - clvIndependiente) < 0.01;
    if (!bien) malos++;
    console.log(
      `${c.documento.padEnd(13)} segmento ${String(c.segmento).padEnd(14)} esperado ${segmentoEsperado.padEnd(14)} margen ${margen.toFixed(2).padStart(9)}  estado ${c.estado.padEnd(9)} esperado ${estadoEsperado.padEnd(9)}  ${bien ? "coincide" : "DIFERENCIA"}`,
    );
  }
  diferencias += malos;

  console.log("");
  console.log(diferencias === 0 ? "Resultado: sin diferencias." : `Resultado: ${diferencias} diferencia(s).`);
  process.exitCode = diferencias === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
