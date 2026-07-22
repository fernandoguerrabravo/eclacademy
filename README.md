# ECL Academy

Plataforma educativa de **Ecommerce Logistics LLC** para sellers de Amazon en Latinoamérica que buscan expandirse al mercado de Estados Unidos.

Construida con **Next.js 14** (App Router + TypeScript), con carrito de compras, pagos vía **Stripe** y matrículas automáticas en **Evolmind** (LMS).

## Requisitos

- Node.js 18+ (probado con Node 22)
- Cuenta de Stripe (modo test)
- Instancia y credenciales de Evolmind

## Instalación

```bash
npm install
cp .env.local.example .env.local   # y completa las variables
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
      courses/route.ts           # GET lista de cursos
      checkout/route.ts          # POST crea sesión de Stripe Checkout
      checkout/session/route.ts  # GET estado de una sesión
      webhooks/stripe/route.ts   # Webhook -> matrícula en Evolmind
  components/                    # Navbar, CartSidebar, CourseCard, etc.
  context/CartContext.tsx        # Estado del carrito (localStorage)
  lib/
    courses.ts                   # Datos de cursos
    stripe.ts                    # Cliente Stripe
    evolmind.ts                  # Cliente Evolmind (matrículas)
public/                          # Logos (ECL, Amazon SPN)
legacy/                          # Sitio estático original (referencia)
```

## Flujo de compra

1. El usuario agrega cursos al carrito (persistido en `localStorage`).
2. Al pagar, se crea una **Stripe Checkout Session** (`/api/checkout`) — los precios se resuelven en el servidor.
3. Stripe redirige a la página de pago y luego a `/matricula/exito`.
4. El **webhook** `checkout.session.completed` matricula al estudiante en Evolmind automáticamente.

### Probar el webhook localmente

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` que imprime a `STRIPE_WEBHOOK_SECRET`.

## Notas de seguridad

- Los precios nunca se toman del cliente; se resuelven desde `src/lib/courses.ts`.
- Las llaves viven en `.env.local` (ignorado por git).
- El webhook valida la firma de Stripe antes de procesar.
