import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const CART_COOKIE = "cartId";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export interface CartItemDTO {
  id: number;
  courseId: number;
  slug: string;
  title: string;
  price: number;
  icon: string;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  total: number;
  count: number;
}

/** Lee el cartId de la cookie (sin crear). */
export function getCartIdFromCookie(): string | undefined {
  return cookies().get(CART_COOKIE)?.value;
}

/** Obtiene el cartId existente o crea un carrito nuevo y setea la cookie. */
export async function getOrCreateCartId(): Promise<string> {
  const store = cookies();
  const existing = store.get(CART_COOKIE)?.value;

  if (existing) {
    // Verifica que el carrito aún exista en la BD
    const found = await prisma.cart.findUnique({ where: { id: existing } });
    if (found) return existing;
  }

  const cart = await prisma.cart.create({ data: {} });
  store.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return cart.id;
}

/** Devuelve el carrito con sus ítems como DTO. */
export async function getCart(cartId: string): Promise<CartDTO> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: { course: true },
    orderBy: { createdAt: "asc" },
  });

  const dto: CartItemDTO[] = items.map((it) => ({
    id: it.id,
    courseId: it.courseId,
    slug: it.course.slug,
    title: it.course.title,
    price: it.course.price,
    icon: it.course.icon,
  }));

  return {
    id: cartId,
    items: dto,
    total: dto.reduce((sum, i) => sum + i.price, 0),
    count: dto.length,
  };
}

/** Carrito vacío (cuando no hay cookie todavía). */
export function emptyCart(): CartDTO {
  return { id: "", items: [], total: 0, count: 0 };
}
