import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { enrollStudent } from "@/lib/evolmind";
import type Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Recibe eventos de Stripe. Cuando un checkout se completa,
 * matricula automáticamente al estudiante en Evolmind.
 *
 * Para probar localmente:
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!webhookSecret) {
    console.warn("[webhook] STRIPE_WEBHOOK_SECRET no configurado");
    return NextResponse.json(
      { error: "Webhook no configurado" },
      { status: 503 }
    );
  }

  if (!signature) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Firma inválida:", err);
    return NextResponse.json(
      { error: "Firma de webhook inválida" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const email = session.customer_details?.email || session.customer_email;
    const name = session.customer_details?.name || "Estudiante";
    const evolmindCourseIds = (
      session.metadata?.evolmindCourseIds || ""
    )
      .split(",")
      .filter(Boolean);

    if (email && evolmindCourseIds.length > 0) {
      for (const courseId of evolmindCourseIds) {
        const result = await enrollStudent({
          email,
          name,
          evolmindCourseId: courseId,
          paymentReference: session.id,
        });
        console.log(
          `[webhook] Matrícula ${courseId} para ${email}: ${result.message}`
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
