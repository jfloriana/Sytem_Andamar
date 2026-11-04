import { PrismaClient } from "@prisma/client";

// Singleton: en desarrollo, el recargado en caliente crearía clientes de más.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
