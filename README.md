# ECL Academy

Plataforma educativa de **Ecommerce Logistics LLC** para sellers de Amazon en Latinoamérica que buscan expandirse al mercado de Estados Unidos.

Construida con **Next.js 14** (App Router + TypeScript), con carrito de compras, pagos vía **Stripe** y matrículas automáticas en **Evolmind** (LMS).

## Requisitos

- Node.js 18+ (probado con Node 22)
- PostgreSQL 14+ (local)
- Cuenta de Stripe (modo test)
- Instancia y credenciales de Evolmind

## Instalación

```bash
npm install
cp .env.example .env               # DATABASE_URL (Postgres)
cp .env.local.example .env.local   # Stripe + Evolmind
```

### Base de datos (PostgreSQL local)

```bash
# 1. Crea la base de datos
createdb ecl_academy

# 2. Ajusta DATABASE_URL en .env
#    postgresql://USUARIO@localhost:5432/ecl_academy?schema=public

# 3. Aplica migraciones y genera el cliente
npm run db:migrate

# 4. Carga los cursos iniciales
npm run db:seed
```

Comandos útiles:

| Comando | Descripción |
|---|---|
| `npm run db:migrate` | Crea/aplica migraciones (Prisma) |
| `npm run db:seed` | Siembra los cursos |
| `npm run db:studio` | Abre Prisma Studio (GUI de la BD) |
| `npm run db:reset` | Resetea la BD y re-siembra |

### Arrancar

```bash
npm run dev
```

Abre http://localhost:3000

## Variables de entorno

Ver `.env.local.example`. Claves principales:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL base (para callbacks de Stripe) |
| `STRIPE_SECRET_KEY` | Llave secreta de Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Llave pública de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe |
| `EVOLMIND_API_URL` | URL de la API de Evolmind |
| `EVOLMIND_API_KEY` | API key de Evolmind |
| `EVOLMIND_ACCOUNT_ID` | ID de cuenta de Evolmind |

> Sin Stripe configurado, el checkout responde 503. Sin Evolmind configurado, la matrícula se **simula** (no bloquea el flujo en desarrollo).

## Estructura

```
src/
  app/
    page.tsx                     # Landing (home)
    cursos/[slug]/page.tsx       # Detalle de curso (estilo Udemy)
    carrito/page.tsx             # Página de carrito
    matricula/exito/page.tsx     # Confirmación de matrícula
    globals.css                  # Estilos (paleta Amazon)
    api/
      cart/route.ts              # GET/POST/DELETE carrito (Postgres)
      courses/route.ts           # GET lista de cursos
      checkout/route.ts          # POST crea sesión de Stripe Checkout
      checkout/session/route.ts  # GET estado de una sesión
      webhooks/stripe/route.ts   # Webhook -> matrícula en Evolmind
  components/                    # Navbar, CartSidebar, CourseCard, etc.
  context/CartContext.tsx        # Estado del carrito (sincroniza con la API)
  lib/
    prisma.ts                    # Cliente Prisma (singleton)
    cart.ts                      # Lógica de carrito (cookie + Postgres)
    courses.ts                   # Tipos + datos base (fuente del seed)
    stripe.ts                    # Cliente Stripe
    evolmind.ts                  # Cliente Evolmind (matrículas)
prisma/
  schema.prisma                  # Modelos: Course, Cart, CartItem
  seed.ts                        # Semilla de cursos
  migrations/                    # Migraciones SQL
public/                          # Logos (ECL, Amazon SPN)
legacy/                          # Sitio estático original (referencia)
```

## Carrito de compras (Postgres)

- El carrito vive en la BD (tablas `carts` y `cart_items`).
- Se identifica con una **cookie anónima** `cartId` (httpOnly, 30 días), sin
  necesidad de login. Cuando exista autenticación, el carrito se asociará a un
  usuario.
- Un curso solo puede estar una vez por carrito (`@@unique([cartId, courseId])`).
- Los precios y datos se leen **siempre desde la BD**, nunca del cliente.

Endpoints:

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/cart` | Devuelve el carrito actual |
| POST | `/api/cart` | Agrega un curso `{ courseId }` |
| DELETE | `/api/cart?courseId=` | Elimina un curso |
| DELETE | `/api/cart` | Vacía el carrito |

## Autenticación

- Usuarios con email + contraseña (hash **bcrypt**).
- Sesión mediante **JWT firmado (jose)** en cookie httpOnly (7 días).
- Requiere `AUTH_SECRET` en `.env.local` (`openssl rand -base64 32`).
- Al iniciar sesión / registrarse, el **carrito anónimo se fusiona** con el del usuario.

Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Páginas: `/login`, `/registro`, `/cuenta` (mis cursos e historial de compras).

## Flujo de compra

1. El usuario agrega cursos al carrito (persistido en Postgres).
2. Al pagar, `/api/checkout` crea una **orden PENDING** (con snapshot de precios) y una **Stripe Checkout Session** — los precios se resuelven desde la BD.
3. Stripe redirige al pago y luego a `/matricula/exito`.
4. El **webhook** `checkout.session.completed`:
   - marca la orden como **PAID**,
   - crea las **matrículas** (`Enrollment`) en la BD,
   - matricula al estudiante en **Evolmind**,
   - vacía el carrito.

El webhook es **idempotente**: si la orden ya está pagada, no reprocesa.

## Integración con evolCampus (EvolMind)

Implementada contra la **API real de evolCampus v26.01** (`https://api.evolcampus.com/api`).

- **Autenticación JWT**: `POST /v1/token` con `clientid` + `key`; el token se
  cachea en memoria y se envía como `Authorization: Bearer <token>`.
- **Matrícula**: `POST /v1/newEnrollment` (`person[email]`, `person[name]`,
  `person[lastname]`, `enroll[groupid]`). Guarda `enrollmentid` y `userid`.
- **Acceso directo**: `POST /v1/getUrlAutologin` para el botón "Ir al curso".
- Cliente con **timeout y reintentos**. Si no está configurado, la matrícula se
  **simula** (no bloquea el flujo en desarrollo).
- Cada `Enrollment` guarda su estado: `evolmindSynced`, `evolmindEnrollmentId`,
  `evolmindUserId`, `evolmindError`, `evolmindSyncedAt`, `syncAttempts`.

### Catálogo: evolCampus es la fuente de verdad

Los cursos **se leen desde evolCampus**; no se crean en nuestra plataforma. El
catálogo local es un espejo que añade solo lo que evolCampus no tiene:
**precio, presentación y el flag de publicación**.

- **Sincronización** (`getCoursesGroups`): crea/actualiza los cursos locales,
  enlazando `evolmindCourseId` y `evolmindGroupId` automáticamente, guardando las
  asignaturas, y desactivando los que ya no existen en evolCampus.
- Los cursos nuevos entran con `price = 0` y `published = false`. El admin fija
  el precio y publica.
- La **tienda** (home, detalle, checkout) muestra solo cursos `published`,
  `active` y con `evolmindGroupId` (matriculables).

### Endpoints admin (protegidos con `ADMIN_TOKEN`)

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/admin/courses` | Cursos locales con su estado |
| POST | `/api/admin/courses` | **Sincroniza** el catálogo desde evolCampus |
| PATCH | `/api/admin/courses` | Edita precio/presentación y publica un curso |
| GET | `/api/admin/evolmind-courses` | Lista cursos reales de evolCampus |
| GET | `/api/admin/evolmind-courses?courseId=ID` | Lista grupos de un curso |
| POST | `/api/admin/evolmind-test` | Prueba una matrícula real sin pago |
| POST | `/api/admin/sync-enrollments` | Reintenta matrículas no sincronizadas |

## Panel de administración (UI)

Interfaz web en **`/admin`** para gestionar el catálogo sin usar `curl`.

- **Login**: `/admin/login` — introduce el `ADMIN_TOKEN`. Se guarda en una cookie
  httpOnly de sesión (8 h). Las rutas admin aceptan la cookie o el header Bearer.
- **Panel** (`/admin`):
  - Botón **Sincronizar desde evolCampus** (trae/actualiza el catálogo)
  - Tabla de cursos: estado de enlace, edición de **precio** y **precio anterior**,
    interruptor **Publicado/Oculto** (deshabilitado si el curso no está enlazado)
  - Botón **Reintentar matrículas** pendientes de sincronizar
  - Cerrar sesión

Los endpoints siguen disponibles por API (header `Authorization: Bearer $ADMIN_TOKEN`)
para automatización:

```bash
# Sincronizar catálogo
curl -X POST /api/admin/courses -H "Authorization: Bearer $ADMIN_TOKEN"

# Fijar precio y publicar (p.ej. curso id 2)
curl -X PATCH /api/admin/courses -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":2,"price":247,"originalPrice":397,"published":true}'
```

### Qué necesito de tu cuenta evolCampus

Solo dos datos para el `.env.local`:

```
EVOLMIND_CLIENT_ID=<tu clientid>
EVOLMIND_API_KEY=<tu key>
```

Luego enlazas cada curso con su `id`/`groupid` reales usando los endpoints de arriba.

### Probar el webhook localmente

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET`.

## Notas de seguridad

- Los precios nunca se toman del cliente; se resuelven desde `src/lib/courses.ts`.
- Las llaves viven en `.env.local` (ignorado por git).
- El webhook valida la firma de Stripe antes de procesar.

## Checklist de despliegue a producción

Cuando se decida salir en vivo (eclacademy.io):

**Infraestructura**
- [ ] Base de datos PostgreSQL gestionada (Neon, Supabase, RDS, etc.)
- [ ] `prisma migrate deploy` en el entorno de producción
- [ ] Hosting Next.js (Vercel recomendado, o servidor propio)

**Variables de entorno (producción)**
- [ ] `DATABASE_URL` → Postgres de producción
- [ ] `NEXT_PUBLIC_SITE_URL=https://eclacademy.io`
- [ ] `AUTH_SECRET` → nuevo (`openssl rand -base64 32`)
- [ ] `ADMIN_TOKEN` → nuevo (`openssl rand -hex 24`)
- [ ] `STRIPE_SECRET_KEY` → llave **live** (`sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` → del endpoint del dashboard (producción)
- [ ] `EVOLMIND_CLIENT_ID` / `EVOLMIND_API_KEY`
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` con dominio verificado en Resend

**Stripe (live)**
- [ ] Crear webhook en el dashboard → `https://eclacademy.io/api/webhooks/stripe`
- [ ] Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
      `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
- [ ] Copiar el signing secret a `STRIPE_WEBHOOK_SECRET`

**Email (Resend)**
- [ ] Verificar dominio `eclacademy.io`
- [ ] Ajustar `EMAIL_FROM` a `no-reply@eclacademy.io`

**Contenido**
- [ ] Crear los cursos en evolCampus (con su contenido)
- [ ] En /admin: Sincronizar → fijar precio → publicar cada curso
- [ ] Revisar textos, iconos y "Lo que aprenderás" de cada curso

**Verificación post-deploy**
- [ ] Compra de prueba (tarjeta real, monto bajo) → matrícula + email + acceso
- [ ] Reembolso de prueba → baja de matrícula
- [ ] Acceso por magic link
- [ ] Progreso visible en /cuenta y /admin

## Estado del proyecto (probado en local)

Flujo completo verificado end-to-end:
`catálogo (evolCampus) → tienda → carrito → pago Stripe → webhook → orden PAID →
cuenta automática → email con acceso → magic link → /cuenta → autologin evolCampus →
progreso/certificado`. Además: reembolso con baja automática, panel admin
(catálogo, ventas, matrículas con progreso), gestión de grupos, y acceso sin contraseña.

**Pendiente para analizar en producción:** bundles/paquetes, ventas B2B (empresas),
encuestas de satisfacción.
