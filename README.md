# Gastos Mensuales

App local para registrar y visualizar gastos mensuales con gráfico de barras apiladas (fijos, variables y préstamos).

## Requisitos

- Node.js 18+
- npm

## Instalación

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

API en `http://localhost:3000/api`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI en `http://localhost:5173`.

## Persistencia

Los datos se guardan en SQLite en `backend/prisma/dev.db`. El archivo **no se borra** al reiniciar la app; permanece entre sesiones.

## Funcionalidades

- Alta manual de gastos (fecha opcional, tipo fijo/variable, préstamo, concepto, cantidad en pesos)
- Lista mensual con toggle de pagado (default: No)
- Gráfico de barras apiladas: morado (fijo), azul (variable), negro (préstamo no pagado)
- Préstamos pagados pasan al segmento fijo o variable en el gráfico
- Modal comparativo al clickear un concepto
- Edición y eliminación inline en la lista
- Fechas pasadas, presentes o futuras permitidas

## Tests

```bash
cd backend && npm test
cd frontend && npm test
```
