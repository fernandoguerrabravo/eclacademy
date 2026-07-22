import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/checkout
 * Crea una sesión de Stripe Checkout con los cursos del carrito.
 * Body: { items: number[], customerEmail?: string }
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
    const customerEmail: string | undefined = body.customerEmail;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 400 }
      );
    }

    // Resolver cursos desde la BD (nunca confiar en precios del cliente)
    const dbCourses = await prisma.course.findMany({
      where: { id: { in: itemIds }, active: true },
    });

    if (dbCourses.length !== itemIds.length) {
      return NextResponse.json(
        { error: "Uno o más cursos no existen o no están disponibles" },
        { status: 400 }
      );
    }

    const lineItems = dbCourses.map((course) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: course.title,
          description: course.shortDescription,
        },
        unit_amount: course.price * 100, // en centavos
      },
      quantity: 1,
    }));

    const enrolledCourseIds = dbCourses.map((c) => c.evolmindCourseId);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: `${siteUrl}/matricula/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/carrito?cancelado=1`,
      metadata: {
        // Guardamos los cursos de Evolmind para matricular en el webhook
        evolmindCourseIds: enrolledCourseIds.join(","),
        courseIds: itemIds.join(","),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      { error: "Error al crear la sesión de pago" },
      { status: 500 }
    );
  }
}
