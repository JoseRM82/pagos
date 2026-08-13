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
```

En `.env` poné la `DATABASE_URL` de Neon (Postgres), por ejemplo:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

```bash
npm install
npx prisma migrate deploy
npm run start:dev
```

API en `http://localhost:3000/api`.

Para cargar datos desde un SQLite local (una sola vez):

```bash
node scripts/import-from-sqlite.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI en `http://localhost:5173`.

## Autenticación

No hay registro. Solo entra el email definido en `AUTH_ALLOWED_EMAIL` vía **Google**.

La sesión dura **30 días** (cookie httpOnly). El aviso al celular lo manda **Google** si tenés la verificación en 2 pasos / “prompt” activado en tu cuenta.

### Google Cloud (una vez)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs y servicios → **Credenciales**
2. Crear **ID de cliente de OAuth** → tipo **Aplicación web**
3. Orígenes autorizados: `https://pagos-api-0f3i.onrender.com`
4. URI de redirección: `https://pagos-api-0f3i.onrender.com/api/auth/google/callback`
5. En Render → Environment, agregar:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://pagos-api-0f3i.onrender.com/api/auth/google/callback
AUTH_ALLOWED_EMAIL=tu-email@gmail.com
JWT_SECRET=<string largo aleatorio>
FRONTEND_URL=https://pagos-peach-zeta.vercel.app
CORS_ORIGIN=https://pagos-peach-zeta.vercel.app,http://localhost:5173
```

Pantalla de consentimiento: tipo **Externo**, estado Prueba, y tu email como usuario de prueba (hasta publicar la app).

Front en producción: [https://pagos-peach-zeta.vercel.app](https://pagos-peach-zeta.vercel.app/).
API: `https://pagos-api-0f3i.onrender.com`.

## Persistencia

Los datos viven en **PostgreSQL (Neon)**. La app local y cualquier otro dispositivo usan la misma `DATABASE_URL`. No se borra al reiniciar; el archivo `prisma/dev.db` queda solo como backup local opcional.

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
