import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // No lanzamos error en import para permitir build sin llaves,
  // pero las rutas API validan antes de usarlo.
  console.warn(
    "[stripe] STRIPE_SECRET_KEY no está configurada. Configúrala en .env.local"
  );
}

export const stripe = new Stripe(stripeSecretKey || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
  typescript: true,
});

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey);
}
