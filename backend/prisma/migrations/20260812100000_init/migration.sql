-- CreateTable
CREATE TABLE "gastos" (
    "id_gasto" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL DEFAULT 'Gasto',
    "cantidad" DECIMAL NOT NULL,
    "prestamo" BOOLEAN NOT NULL DEFAULT false,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");

-- CreateIndex
CREATE INDEX "gastos_concepto_idx" ON "gastos"("concepto");
