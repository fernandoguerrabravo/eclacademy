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

## Integración con Evolmind / evolCampus

La matrícula en el LMS está desacoplada y es **observable**:

- Cada `Enrollment` guarda su estado de sync: `evolmindSynced`, `evolmindEnrollmentId`,
  `evolmindError`, `evolmindSyncedAt`, `syncAttempts`.
- El adaptador (`src/lib/evolmind.ts`) hace peticiones con **timeout y reintentos**
  y es totalmente **configurable por entorno** (formato form/JSON, nombres de
  parámetros y campos), para adaptarse a la API exacta de tu cuenta evolCampus.
- Si Evolmind no está configurado, la matrícula se **simula** (no bloquea el flujo).

Endpoints administrativos (protegidos con `ADMIN_TOKEN`):

| Método | Ruta | Acción |
|---|---|---|
| POST | `/api/admin/evolmind-test` | Prueba una matrícula real sin pasar por pago |
| POST | `/api/admin/sync-enrollments` | Reintenta matrículas no sincronizadas |

Ejemplo de prueba de conexión:

```bash
curl -X POST http://localhost:3000/api/admin/evolmind-test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ecl.com","name":"Test","evolmindCourseId":"EVM-CUST-001"}'
```

### Qué necesito de tu cuenta evolCampus para finalizar

Para dejar la matrícula 100% operativa, obtén del panel de evolCampus:

1. **URL del endpoint de la API** (`EVOLMIND_API_URL`)
2. **Clave privada de la API** (`EVOLMIND_API_KEY`)
3. **Formato y nombres de parámetros** de la acción de matrícula: nombre del
   parámetro de la clave, de la acción, y de los campos (email, nombre, curso).
4. El **código/ID de cada curso en evolCampus** → se guarda en
   `Course.evolmindCourseId` (actualmente valores placeholder `EVM-*`).

Con esos datos solo hay que completar las variables `EVOLMIND_*` en `.env.local`.

## Creación de cursos y sincronización con evolCampus

> **Hallazgo:** la API pública de evolCampus está orientada a **matrícula de
> alumnos**. La creación de cursos se hace normalmente en su **editor** (el
> contenido se construye en la plataforma). Confirma con soporte de evolCampus
> si tu cuenta expone un endpoint para crear cursos por API.

Cada `Course` guarda su estado de vínculo con evolCampus: `evolmindCourseId`,
`evolmindSynced`, `evolmindError`. El servicio de creación soporta 3 escenarios:

1. **Enlace directo** — envías `evolmindCourseId` (código ya existente en
   evolCampus) → queda enlazado (`evolmindSynced = true`).
2. **Creación por API** — si `EVOLMIND_COURSE_CREATE_ENABLED=true` y evolCampus
   lo soporta, se crea el curso allí y se guarda el código devuelto.
3. **Pendiente** — se crea en la BD y queda marcado para enlace manual.

Endpoints admin (protegidos con `ADMIN_TOKEN`):

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/admin/courses` | Lista cursos con su estado de sync |
| POST | `/api/admin/courses` | Crea un curso (enlaza/crea en evolCampus) |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/admin/courses \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"registro-marca","title":"Registro de Marca en USA","category":"Legal","icon":"fa-trademark","shortDescription":"...","description":"...","price":197,"originalPrice":297,"evolmindCourseId":"EVM-MARCA-007"}'
```

### Probar el webhook localmente

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET`.

## Notas de seguridad

- Los precios nunca se toman del cliente; se resuelven desde `src/lib/courses.ts`.
- Las llaves viven en `.env.local` (ignorado por git).
- El webhook valida la firma de Stripe antes de procesar.
