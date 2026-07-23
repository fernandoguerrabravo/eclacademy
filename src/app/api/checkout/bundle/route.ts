import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * POST /api/checkout/bundle  body: { bundleId }
 * Crea una orden (PENDING) por el precio del paquete, con sus cursos como
 * ítems (para matricular en cada uno), y una sesión de Stripe Checkout.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe no está configurado" },
        { status: 503 }
      );
    }

    const { bundleId } = await req.json();
    if (!bundleId) {
      return NextResponse.json({ error: "bundleId requerido" }, { status: 400 });
    }

    const bundle = await prisma.bundle.findUnique({
      where: { id: Number(bundleId) },
      include: { courses: { include: { course: true } } },
    });

    if (!bundle || !bundle.published || bundle.courses.length === 0) {
      return NextResponse.json(
        { error: "Paquete no disponible" },
        { status: 404 }
      );
    }

    // Todos los cursos del paquete deben ser matriculables
    const notLinked = bundle.courses.filter(
      (bc) => !bc.course.evolmindGroupId || !bc.course.active
    );
    if (notLinked.length > 0) {
      return NextResponse.json(
        { error: "Uno o más cursos del paquete no están disponibles" },
        { status: 409 }
      );
    }

    const session = await getSession();
    const customerEmail = session?.email;

    // Orden PENDING: total = precio del paquete; ítems = cursos del paquete
    const order = await prisma.order.create({
      data: {
        userId: session?.userId,
        email: customerEmail || "",
        status: "PENDING",
        total: bundle.price,
        items: {
          create: bundle.courses.map((bc) => ({
            courseId: bc.course.id,
            title: bc.course.title,
            price: 0, // el cargo es el precio del paquete (una sola línea)
          })),
        },
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bundle.title,
              description: `Paquete · ${bundle.courses.length} cursos`,
            },
            unit_amount: bundle.price * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/matricula/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/paquetes/${bundle.slug}?cancelado=1`,
      metadata: { orderId: order.id, bundleId: String(bundle.id) },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkout.id },
    });

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (error) {
    console.error("[checkout:bundle] Error:", error);
    return NextResponse.json(
      { error: "Error al crear la sesión de pago" },
      { status: 500 }
    );
  }
}
