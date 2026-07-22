import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  createAndSyncEnrollment,
  cancelEnrollmentsForOrder,
} from "@/lib/enrollments";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 *
 * Eventos manejados:
 *  - checkout.session.completed            -> pago confirmado: matricular
 *  - checkout.session.async_payment_succeeded -> pago diferido confirmado: matricular
 *  - checkout.session.async_payment_failed -> pago diferido fallido: orden FAILED
 *  - checkout.session.expired              -> sesión expirada: orden FAILED
 *  - charge.refunded                       -> reembolso: baja de matrículas
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

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfillOrder(event.data.object as Stripe.Checkout.Session);
        break;

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await failOrder(event.data.object as Stripe.Checkout.Session);
        break;

      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        // Otros eventos: se ignoran silenciosamente
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error procesando ${event.type}:`, err);
    // 500 hace que Stripe reintente el envío
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Pago confirmado -> marca PAID, crea matrículas y sincroniza con evolCampus. */
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
  if (order.status === "PAID") return; // idempotente

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", email: email || order.email },
  });

  for (const item of order.items) {
    await createAndSyncEnrollment({
      userId: order.userId ?? null,
      courseId: item.courseId,
      orderId: order.id,
      email: email || order.email,
      name,
    });
  }

  if (order.userId) {
    const cart = await prisma.cart.findFirst({ where: { userId: order.userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}

/** Pago fallido o sesión expirada -> marca la orden como FAILED. */
async function failOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "PAID") return; // no tocar órdenes ya pagadas
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "FAILED" },
  });
  console.log(`[webhook] Orden ${orderId} marcada FAILED`);
}

/** Reembolso -> marca la orden REFUNDED y da de baja las matrículas. */
async function handleRefund(charge: Stripe.Charge) {
  // Ubica la orden por el PaymentIntent o la Checkout Session asociada.
  let order = null;

  if (charge.payment_intent) {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: charge.payment_intent as string,
      limit: 1,
    });
    const orderId = sessions.data[0]?.metadata?.orderId;
    if (orderId) {
      order = await prisma.order.findUnique({ where: { id: orderId } });
    }
  }

  if (!order) {
    console.warn(
      `[webhook] Reembolso sin orden asociada (charge ${charge.id})`
    );
    return;
  }
  if (order.status === "REFUNDED") return; // idempotente

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "REFUNDED" },
  });
  await cancelEnrollmentsForOrder(order.id);
  console.log(`[webhook] Orden ${order.id} reembolsada y matrículas dadas de baja`);
}
