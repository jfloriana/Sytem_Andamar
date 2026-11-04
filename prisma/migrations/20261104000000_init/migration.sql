-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'GERENCIA', 'JEFE_VENTAS', 'VENDEDOR', 'JEFE_SERVICIO', 'EJECUTIVO_SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'INACTIVO', 'EN_RIESGO');

-- CreateEnum
CREATE TYPE "Segmento" AS ENUM ('A', 'B', 'C', 'SIN_CLASIFICAR');

-- CreateEnum
CREATE TYPE "EtapaOportunidad" AS ENUM ('PROSPECTO', 'CONTACTADO', 'PROPUESTA', 'NEGOCIACION', 'GANADA', 'PERDIDA');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('VISITA', 'LLAMADA', 'MENSAJE', 'TAREA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('REGISTRADO', 'ENTREGADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "PrioridadCaso" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('ABIERTO', 'EN_PROCESO', 'ESCALADO', 'RESUELTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "FinalidadConsentimiento" AS ENUM ('SERVICIO', 'PROMOCIONES', 'ANALITICA');

-- CreateEnum
CREATE TYPE "CanalConsentimiento" AS ENUM ('TELEFONO', 'EMAIL', 'WHATSAPP', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "TipoSolicitudTitular" AS ENUM ('ACCESO', 'RECTIFICACION', 'SUPRESION');

-- CreateEnum
CREATE TYPE "EstadoSolicitudTitular" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'ATENDIDA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "jefeId" TEXT,
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "segmento" "Segmento" NOT NULL DEFAULT 'SIN_CLASIFICAR',
    "vendedorId" TEXT NOT NULL,
    "condicionesEspeciales" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oportunidad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "etapa" "EtapaOportunidad" NOT NULL DEFAULT 'PROSPECTO',
    "montoEstimado" DECIMAL(12,2) NOT NULL,
    "motivoPerdida" TEXT,
    "cerradaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oportunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "clienteId" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "recordatorioAt" TIMESTAMP(3),
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "vendedorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "margen" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'REGISTRADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caso" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" "PrioridadCaso" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoCaso" NOT NULL DEFAULT 'ABIERTO',
    "responsableId" TEXT NOT NULL,
    "aperturaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "primeraRespuestaAt" TIMESTAMP(3),
    "resueltoAt" TIMESTAMP(3),
    "resueltoPrimerContacto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentimiento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "finalidad" "FinalidadConsentimiento" NOT NULL,
    "canal" "CanalConsentimiento" NOT NULL,
    "otorgadoAt" TIMESTAMP(3) NOT NULL,
    "retiradoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consentimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentoHistorico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "mes" TIMESTAMP(3) NOT NULL,
    "segmento" "Segmento" NOT NULL,
    "margenAnual" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SegmentoHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudTitular" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoSolicitudTitular" NOT NULL,
    "estado" "EstadoSolicitudTitular" NOT NULL DEFAULT 'PENDIENTE',
    "solicitadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudTitular_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "detalle" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_documento_key" ON "Cliente"("documento");

-- CreateIndex
CREATE INDEX "Cliente_documento_idx" ON "Cliente"("documento");

-- CreateIndex
CREATE INDEX "Cliente_vendedorId_idx" ON "Cliente"("vendedorId");

-- CreateIndex
CREATE INDEX "Contacto_clienteId_idx" ON "Contacto"("clienteId");

-- CreateIndex
CREATE INDEX "Oportunidad_etapa_vendedorId_idx" ON "Oportunidad"("etapa", "vendedorId");

-- CreateIndex
CREATE INDEX "Oportunidad_clienteId_idx" ON "Oportunidad"("clienteId");

-- CreateIndex
CREATE INDEX "Actividad_clienteId_fecha_idx" ON "Actividad"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Actividad_usuarioId_completada_idx" ON "Actividad"("usuarioId", "completada");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_fecha_idx" ON "Pedido"("clienteId", "fecha");

-- CreateIndex
CREATE INDEX "Caso_estado_fechaLimite_idx" ON "Caso"("estado", "fechaLimite");

-- CreateIndex
CREATE INDEX "Caso_clienteId_idx" ON "Caso"("clienteId");

-- CreateIndex
CREATE INDEX "Consentimiento_clienteId_finalidad_idx" ON "Consentimiento"("clienteId", "finalidad");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentoHistorico_clienteId_mes_key" ON "SegmentoHistorico"("clienteId", "mes");

-- CreateIndex
CREATE INDEX "SolicitudTitular_clienteId_idx" ON "SolicitudTitular"("clienteId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_jefeId_fkey" FOREIGN KEY ("jefeId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidad" ADD CONSTRAINT "Oportunidad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidad" ADD CONSTRAINT "Oportunidad_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentimiento" ADD CONSTRAINT "Consentimiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentoHistorico" ADD CONSTRAINT "SegmentoHistorico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudTitular" ADD CONSTRAINT "SolicitudTitular_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

