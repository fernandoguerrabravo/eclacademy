import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCart, getOrCreateCartId, resolveCurrentCart } from "@/lib/cart";

// GET /api/cart -> carrito actual
export async function GET() {
  const cart = await resolveCurrentCart();
  return NextResponse.json({ cart });
}

// POST /api/cart  body: { courseId: number } -> agrega un curso
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId = Number(body.courseId);

    if (!courseId || Number.isNaN(courseId)) {
      return NextResponse.json(
        { error: "courseId inválido" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course || !course.active || !course.published) {
      return NextResponse.json(
        { error: "Curso no disponible" },
        { status: 404 }
      );
    }

    const cartId = await getOrCreateCartId();

    // upsert evita duplicados (unique cartId+courseId)
    await prisma.cartItem.upsert({
      where: { cartId_courseId: { cartId, courseId } },
      update: {},
      create: { cartId, courseId },
    });

    const cart = await getCart(cartId);
    return NextResponse.json({ cart });
  } catch (error) {
    console.error("[cart:POST] Error:", error);
    return NextResponse.json(
      { error: "Error al agregar al carrito" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart          -> vacía el carrito
// DELETE /api/cart?courseId -> elimina un curso
export async function DELETE(req: NextRequest) {
  const cartId = await getOrCreateCartId();
  const courseIdParam = req.nextUrl.searchParams.get("courseId");

  if (courseIdParam) {
    const courseId = Number(courseIdParam);
    await prisma.cartItem.deleteMany({ where: { cartId, courseId } });
  } else {
    await prisma.cartItem.deleteMany({ where: { cartId } });
  }

  const cart = await getCart(cartId);
  return NextResponse.json({ cart });
}
