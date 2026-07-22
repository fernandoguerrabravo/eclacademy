import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

function setCartCookie(cartId: string) {
  cookies().set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Resuelve el carrito activo:
 * - Si hay usuario logueado: usa (o crea) su carrito y fusiona el carrito
 *   anónimo de la cookie si existe.
 * - Si no: usa (o crea) el carrito anónimo identificado por cookie.
 */
export async function getOrCreateCartId(): Promise<string> {
  const session = await getSession();
  const cookieCartId = cookies().get(CART_COOKIE)?.value;

  if (session) {
    // Carrito del usuario
    let userCart = await prisma.cart.findFirst({
      where: { userId: session.userId },
    });
    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId: session.userId },
      });
    }

    // Fusionar carrito anónimo -> carrito del usuario
    if (cookieCartId && cookieCartId !== userCart.id) {
      const anonItems = await prisma.cartItem.findMany({
        where: { cartId: cookieCartId },
      });
      for (const item of anonItems) {
        await prisma.cartItem.upsert({
          where: {
            cartId_courseId: {
              cartId: userCart.id,
              courseId: item.courseId,
            },
          },
          update: {},
          create: { cartId: userCart.id, courseId: item.courseId },
        });
      }
      // Elimina el carrito anónimo ya fusionado
      await prisma.cart
        .delete({ where: { id: cookieCartId } })
        .catch(() => {});
    }

    setCartCookie(userCart.id);
    return userCart.id;
  }

  // Sin sesión: carrito anónimo
  if (cookieCartId) {
    const found = await prisma.cart.findUnique({
      where: { id: cookieCartId },
    });
    if (found) return cookieCartId;
  }

  const cart = await prisma.cart.create({ data: {} });
  setCartCookie(cart.id);
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

/** Resuelve el carrito actual (para GET), considerando la sesión. */
export async function resolveCurrentCart(): Promise<CartDTO> {
  const session = await getSession();
  if (session) {
    const cartId = await getOrCreateCartId();
    return getCart(cartId);
  }
  const cookieCartId = getCartIdFromCookie();
  if (!cookieCartId) return emptyCart();
  const found = await prisma.cart.findUnique({
    where: { id: cookieCartId },
  });
  if (!found) return emptyCart();
  return getCart(cookieCartId);
}
