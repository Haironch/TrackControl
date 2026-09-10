# TrackControl

Prototipo funcional de un **sistema de control operativo y financiero de envíos** gestionados por paqueterías externas (Cargo Express, Forza, Guatex, Cargo Expreso, mensajería interna, etc.).

No es solo tracking: responde a la pregunta **"¿dónde está mi paquete y dónde está mi dinero?"** — controla el ciclo completo de cada envío (nuevo → preparado → entregado a paquetería → en tránsito → entregado / rechazado / en retorno) y su conciliación financiera (pendiente → por liquidar → liquidado / ajuste / disputa), incluyendo liquidaciones, incidencias y reportes.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, Radix UI, TanStack Query, React Router, Recharts, Zod, Sonner |
| Backend | Node.js + TypeScript + Express 5, Zod para validación |
| Persistencia actual | Archivos JSON (`apps/api/data/seed`), con repositorio desacoplado |
| Persistencia futura | PostgreSQL + Prisma (modelos y esquema ya diseñados) |
| Monorepo | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) |

## Estructura

```
apps/
  api/            Backend Express (API REST)
    src/
      config/           env vars
      core/
        errors/         AppError y subclases (404, 409, 422, etc.)
        http/           validate() con Zod, manejo central de errores
        persistence/    JsonDataSource (carga/guarda JSON) + Repositories
        repositories/   Repository<T> interface + JsonRepository
        utils/          fechas, dinero, ids, logger
      modules/          un módulo por dominio: shipments, carriers, customers,
                         incidents, settlements, dashboard, reports, users, statuses, auth
        <modulo>.service.ts   lógica de negocio (solo conoce Repository<T>)
        <modulo>.routes.ts    endpoints Express + validación
      data/seed/generate.ts   generador de datos simulados (semilla determinista)
      container.ts      composition root (conecta repos + services)
      app.ts / main.ts
    data/seed/          JSON generados (124 envíos, 30 clientes, 5 paqueterías...)
    data/runtime/       JSON con los cambios hechos en vivo (git-ignored)
    prisma/              (vacío, reservado para schema.prisma futuro)
  web/            Frontend React
    src/
      components/ui/        librería de componentes (Button, Card, Table, Dialog...)
      components/<dominio>/ componentes específicos (shipments, dashboard, settlements)
      components/layout/    Sidebar, Header, AppShell
      hooks/                 React Query hooks (use-shipments, use-operations...)
      lib/                   api client, utils de formato, colores
      pages/                 una página por ruta
packages/
  shared/         Tipos, enums, DTOs y catálogo de estados compartidos entre API y web
```

### Por qué está separado así

La lógica de negocio (`*.service.ts`) solo conoce la interfaz `Repository<T>`, nunca archivos JSON directamente. Migrar a PostgreSQL implica:

1. Definir `prisma/schema.prisma` con las entidades de `packages/shared/src/entities.ts` (ya pensadas para relacional).
2. Crear `PrismaRepository<T>` que implemente `Repository<T>`.
3. Cambiar `createRepositories()` en `apps/api/src/core/persistence/data-source.ts` para devolver los repositorios de Prisma cuando `DATA_SOURCE=postgres`.

Ningún service, route ni componente del frontend cambia.

## Cómo correrlo

Requiere Node 20+.

```bash
npm install
npm run seed      # genera los datos simulados en apps/api/data/seed
npm run dev        # levanta API (puerto 4000) y web (puerto 5173) en paralelo
```

Abrir [http://localhost:5173](http://localhost:5173).

Variables de entorno: copiar `.env.example` a `.env` en la raíz (o dentro de `apps/api` / `apps/web` si se prefiere aislado). Por defecto:

- `DATA_SOURCE=json` — origen de datos actual.
- `PERSIST_JSON=true` — los cambios hechos en la UI se guardan en `apps/api/data/runtime/` (no afecta el seed original).
- `SHIFT_MOCK_DATES=true` — al cargar, las fechas del seed se desplazan para que la fecha más reciente coincida con "hoy", así el dashboard siempre se ve con datos recientes en cualquier fecha que se abra el proyecto.

Para reiniciar el demo a su estado original:

```bash
rm -rf apps/api/data/runtime
npm run seed
```

## Usuario / roles simulados

No hay login todavía (queda preparado para JWT/sesión real vía `x-user-id` header, ver `apps/api/src/modules/auth`). El selector de usuario en la esquina superior derecha del frontend permite cambiar entre los 5 roles para probar permisos:

- **Administrador** — acceso total.
- **Operador** — crea paquetes, cambia estados.
- **Bodega** — cambia estados, ve paqueterías.
- **Contabilidad** — liquidaciones y reportes.
- **Supervisor** — solo lectura de reportes y dashboard.

## Qué se puede probar

- Dashboard con indicadores operativos y financieros, gráficas (envíos/día, tasa de éxito, ventas por semana, rendimiento por paquetería) y **cierre del día**.
- Tabla de paquetes con filtros (estado, categoría, paquetería, departamento, estado financiero, fechas), búsqueda y orden.
- Crear/editar un envío completo (productos, cliente, paquetería, tipo de pago).
- Cambiar el estado de un envío (con validación de transiciones según el catálogo configurable) — al marcar **Entregado** un envío contra entrega, el monto pasa automáticamente a "pendiente de liquidación".
- Línea de tiempo completa por envío (fecha, hora, estado anterior/nuevo, usuario, comentario).
- Registrar incidencias y resolverlas.
- Registrar liquidaciones seleccionando los envíos entregados de una paquetería — al confirmar, esos envíos pasan a "Liquidado" (o "Ajuste" si el monto depositado difiere).
- Módulo de paqueterías y clientes con métricas (tasa de entrega, clientes con muchos rechazos).
- Reportes tabulares (entregas, devoluciones, rendimiento por paquetería, liquidaciones, incidencias) con filtros de fecha/paquetería — los botones de exportar Excel/PDF están conectados a un endpoint que responde `501 Not Implemented` a propósito, dejando la arquitectura lista.

## Preparado para (no implementado aún)

Integraciones con APIs de paqueterías, tracking automático, webhooks, WhatsApp/SMS, escaneo QR/código de barras, app móvil, foto de entrega, firma digital, GPS y rutas, IA para predicción de devoluciones, integración con tiendas online (WooCommerce/Shopify), facturación y conciliación bancaria. Los modelos de datos (`Attachment`, `GeoPoint`, `Carrier.integration`) y la sección **Configuración → Módulos previstos** del frontend documentan estos puntos de extensión.
