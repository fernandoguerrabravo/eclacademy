import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getCourseById } from "@/lib/courses";

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

    // Resolver cursos desde el servidor (nunca confiar en precios del cliente)
    const lineItems = [];
    const enrolledCourseIds: string[] = [];

    for (const id of itemIds) {
      const course = getCourseById(id);
      if (!course) {
        return NextResponse.json(
          { error: `Curso ${id} no encontrado` },
          { status: 400 }
        );
      }
      enrolledCourseIds.push(course.evolmindCourseId);
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title,
            description: course.shortDescription,
          },
          unit_amount: course.price * 100, // en centavos
        },
        quantity: 1,
      });
    }

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
