-- CreateTable
CREATE TABLE "ingresos" (
    "id_ingreso" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT NOT NULL DEFAULT 'Ingreso',
    "cantidad" DECIMAL(65,30) NOT NULL,
    "prestamo" BOOLEAN NOT NULL DEFAULT false,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id_ingreso")
);

-- CreateIndex
CREATE INDEX "ingresos_fecha_idx" ON "ingresos"("fecha");

-- CreateIndex
CREATE INDEX "ingresos_concepto_idx" ON "ingresos"("concepto");
