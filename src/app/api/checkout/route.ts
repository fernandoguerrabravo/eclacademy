import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/checkout
 * Crea una orden (PENDING) y una sesión de Stripe Checkout.
 * Body: { items: number[] (courseIds), customerEmail?: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe no está configurado. Añade STRIPE_SECRET_KEY en .env.local",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const itemIds: number[] = body.items || [];

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 400 }
      );
    }

    // Cursos desde la BD (precios de confianza, solo publicados y matriculables)
    const dbCourses = await prisma.course.findMany({
      where: {
        id: { in: itemIds },
        active: true,
        published: true,
        NOT: { evolmindGroupId: null },
      },
    });

    if (dbCourses.length !== itemIds.length) {
      return NextResponse.json(
        { error: "Uno o más cursos no existen o no están disponibles" },
        { status: 400 }
      );
    }

    const session = await getSession();
    const customerEmail: string | undefined =
      session?.email || body.customerEmail;

    const total = dbCourses.reduce((sum, c) => sum + c.price, 0);

    // Crea la orden PENDING con snapshot de precios
    const order = await prisma.order.create({
      data: {
        userId: session?.userId,
        email: customerEmail || "",
        status: "PENDING",
        total,
        items: {
          create: dbCourses.map((c) => ({
            courseId: c.id,
            title: c.title,
            price: c.price,
          })),
        },
      },
    });

    const lineItems = dbCourses.map((course) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: course.title,
          description: course.shortDescription,
        },
        unit_amount: course.price * 100,
      },
      quantity: 1,
    }));

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: customerEmail || undefined,
      success_url: `${siteUrl}/matricula/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/carrito?cancelado=1`,
      metadata: {
        orderId: order.id,
        courseIds: dbCourses.map((c) => c.id).join(","),
      },
    });

    // Guarda el session id en la orden para reconciliar en el webhook
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkout.id },
    });

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      { error: "Error al crear la sesión de pago" },
      { status: 500 }
    );
  }
}
