import { Prisma, PrismaClient } from "@prisma/client";

// Singleton: en desarrollo, el recargado en caliente crearía clientes de más.
function crearCliente(): PrismaClient {
  const extendido = new PrismaClient().$extends({
    query: {
      // La base remota (Supabase) puede rechazar de forma transitoria la primera conexión (P1001) o cerrar conexiones inactivas (P1017).
      // Se reintenta poco y con espera corta; cualquier otro error se propaga tal cual.
      async $allOperations({ operation, args, query }) {
        for (let intento = 1; ; intento++) {
          try {
            return await query(args);
          } catch (error) {
            // P1001: nunca se llegó a conectar (siempre seguro). P1017: el servidor cerró una conexión
            // inactiva; solo se reintenta en lecturas para no repetir una escritura posiblemente aplicada.
            // Según el momento, Prisma lo informa como error de inicialización o como error conocido.
            const sinConexion =
              (error instanceof Prisma.PrismaClientInitializationError && error.errorCode === "P1001") ||
              (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001");
            const conexionCerrada =
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P1017" &&
              /^(find|count|aggregate|groupBy)/.test(operation);
            const transitorio = sinConexion || conexionCerrada;
            if (!transitorio || intento >= 3) throw error;
            await new Promise((r) => setTimeout(r, 300 * intento));
          }
        }
      },
    },
  });
  // La extensión solo añade reintentos: la superficie de la API es la misma que la de PrismaClient.
  return extendido as unknown as PrismaClient;
}

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
