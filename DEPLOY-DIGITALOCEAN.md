# Despliegue en DigitalOcean App Platform

Guía para publicar ECL Academy (Next.js) en DO App Platform.

## 1. Crear la App

1. En DigitalOcean: **Apps → Create App**
2. Fuente: **GitHub** → repo `fernandoguerrabravo/eclacademy`, rama `master`
   - Activa **Autodeploy on push** (opcional)
3. DO detecta Next.js. Confirma el componente **Web Service** con:
   - **Build command:** `npm run build`
   - **Run command:** `npm start`
   - **HTTP port:** `8080`
   - **Plan:** Basic (basic-xxs está bien para empezar)

> Alternativa rápida: usa el archivo `.do/app.yaml` de este repo
> (Create App → Edit App Spec → pega el YAML).

## 2. Variables de entorno (Settings → Environment Variables)

Márcalas como **Encrypted** (SECRET):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (tu Postgres de DO, con `?sslmode=require`) |
| `NEXT_PUBLIC_SITE_URL` | `https://eclacademy.io` |
| `AUTH_SECRET` | genera: `openssl rand -base64 32` |
| `ADMIN_TOKEN` | genera: `openssl rand -hex 24` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | (del webhook del dashboard, paso 5) |
| `EVOLMIND_API_URL` | `https://api.evolcampus.com/api` |
| `EVOLMIND_CLIENT_ID` | tu clientid |
| `EVOLMIND_API_KEY` | tu key |
| `RESEND_API_KEY` | `re_...` |
| `EMAIL_FROM` | `ECL Academy <no-reply@eclacademy.io>` |

> `DATABASE_URL` debe estar disponible en **build y run** (el job de migración la usa).

## 3. Migraciones de base de datos

El `app.yaml` incluye un **job PRE_DEPLOY** que corre `prisma migrate deploy`
antes de cada despliegue. Si creaste la app por UI sin el YAML, añade el job:

- **Create → Job** → mismo repo → kind **Before Deploy** (Pre-deploy)
- Run command: `npx prisma migrate deploy`
- Env: `DATABASE_URL`

(Ya aplicamos las migraciones manualmente una vez, así que la primera vez no hará cambios.)

## 4. Dominio

- **Settings → Domains → Add Domain** → `eclacademy.io`
- Configura los registros DNS que indique DO (CNAME/A). HTTPS es automático.

## 5. Webhook de Stripe (producción)

1. Stripe Dashboard (modo **live**) → Developers → Webhooks → Add endpoint
2. URL: `https://eclacademy.io/api/webhooks/stripe`
3. Eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
4. Copia el **Signing secret** → variable `STRIPE_WEBHOOK_SECRET` en DO → redeploy

## 6. Email (Resend)

- Verifica el dominio `eclacademy.io` en Resend (registros SPF/DKIM)
- `EMAIL_FROM` = `ECL Academy <no-reply@eclacademy.io>`

## 7. Puesta a punto del catálogo

1. Entra a `https://eclacademy.io/admin/login` con tu `ADMIN_TOKEN`
2. **Sincronizar desde evolCampus**
3. Fija precio y **publica** cada curso (y paquetes/empresas si aplica)

## 8. Verificación post-deploy

- [ ] Home y catálogo cargan
- [ ] Compra de prueba (monto bajo, tarjeta real) → orden PAID + email + acceso
- [ ] Magic link entra a `/cuenta` → "Ir al curso" abre evolCampus
- [ ] Reembolso de prueba → baja de matrícula
- [ ] Rotar la contraseña de la BD si se compartió en algún canal
