-- AlterTable
ALTER TABLE "SolicitudTitular" ADD COLUMN "detalle" TEXT,
ADD COLUMN "resolucion" TEXT;

-- CreateTable
CREATE TABLE "PoliticaPrivacidad" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoliticaPrivacidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoliticaPrivacidad_version_key" ON "PoliticaPrivacidad"("version");

-- AddForeignKey
ALTER TABLE "PoliticaPrivacidad" ADD CONSTRAINT "PoliticaPrivacidad_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
