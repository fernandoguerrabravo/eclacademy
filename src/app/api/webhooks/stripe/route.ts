import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createAndSyncEnrollment } from "@/lib/enrollments";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Al completarse el checkout:
 *  1. Marca la orden como PAID
 *  2. Crea las matrículas (Enrollment) en la BD
 *  3. Sincroniza cada matrícula con Evolmind (con estado y reintentos)
 *  4. Vacía el carrito del usuario
 *
 * Prueba local:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!webhookSecret) {
    console.warn("[webhook] STRIPE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Firma inválida:", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await fulfillOrder(session);
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  const email =
    session.customer_details?.email || session.customer_email || "";
  const name = session.customer_details?.name || "Estudiante";

  if (!orderId) {
    console.warn("[webhook] Sesión sin orderId en metadata");
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    console.warn(`[webhook] Orden ${orderId} no encontrada`);
    return;
  }

  // Idempotencia: si ya está pagada, no reprocesar
  if (order.status === "PAID") return;

  // 1. Marca la orden como pagada
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", email: email || order.email },
  });

  // 2 y 3. Crea matrículas y sincroniza con Evolmind
  for (const item of order.items) {
    await createAndSyncEnrollment({
      userId: order.userId ?? null,
      courseId: item.courseId,
      orderId: order.id,
      email: email || order.email,
      name,
    });
  }

  // 4. Vacía el carrito del usuario
  if (order.userId) {
    const cart = await prisma.cart.findFirst({
      where: { userId: order.userId },
    });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}
