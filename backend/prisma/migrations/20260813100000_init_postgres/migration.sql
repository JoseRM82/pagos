-- CreateTable
CREATE TABLE "gastos" (
    "id_gasto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL DEFAULT 'Gasto',
    "cantidad" DECIMAL(65,30) NOT NULL,
    "prestamo" BOOLEAN NOT NULL DEFAULT false,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id_gasto")
);

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");

-- CreateIndex
CREATE INDEX "gastos_concepto_idx" ON "gastos"("concepto");
