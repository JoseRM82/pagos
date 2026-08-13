/**
 * Importa gastos desde el SQLite local hacia Postgres (DATABASE_URL).
 * Uso: node scripts/import-from-sqlite.js
 */
const { DatabaseSync } = require('node:sqlite');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const sqlitePath = fs.existsSync(path.join(__dirname, '..', 'prisma', 'dev.db'))
  ? path.join(__dirname, '..', 'prisma', 'dev.db')
  : path.join(__dirname, '..', '..', 'dev.db');

async function main() {
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`No se encontró SQLite en ${sqlitePath}`);
  }

  const sqlite = new DatabaseSync(sqlitePath);
  const rows = sqlite
    .prepare(
      `SELECT id_gasto, fecha, tipo, concepto, cantidad, prestamo, pagado, created_at
       FROM gastos`,
    )
    .all();
  sqlite.close();

  console.log(`Leídos ${rows.length} gastos desde SQLite`);

  const prisma = new PrismaClient();
  try {
    const data = rows.map((r) => ({
      idGasto: r.id_gasto,
      fecha: new Date(r.fecha),
      tipo: r.tipo,
      concepto: r.concepto,
      cantidad: r.cantidad,
      prestamo: Boolean(r.prestamo),
      pagado: Boolean(r.pagado),
      createdAt: new Date(r.created_at),
    }));

    const result = await prisma.gasto.createMany({
      data,
      skipDuplicates: true,
    });
    const total = await prisma.gasto.count();
    console.log(`Insertados ${result.count}. Total en Postgres: ${total}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
