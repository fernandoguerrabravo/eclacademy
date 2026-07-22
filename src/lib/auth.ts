import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fallback solo para desarrollo; en producción DEBE definirse AUTH_SECRET.
    console.warn("[auth] AUTH_SECRET no definido, usando clave de desarrollo.");
    return new TextEncoder().encode("dev-insecure-secret-change-me-please-32b");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

// ----- Password -----
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ----- JWT / Sesión -----
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function destroySession(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Devuelve el usuario completo de la BD para la sesión actual, o null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

// ----- Magic link (acceso por email, sin contraseña) -----
const MAGIC_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

/** Genera un token firmado para acceso por email. */
export async function createMagicToken(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAGIC_MAX_AGE}s`)
    .sign(getSecret());
}

/** Verifica un token de magic link y devuelve el userId, o null. */
export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "magic") return null;
    return (payload.userId as string) || null;
  } catch {
    return null;
  }
}

/**
 * Busca un usuario por email o lo crea (para compras de invitado).
 * Los usuarios creados así no tienen contraseña usable; acceden por magic link
 * hasta que definan una contraseña.
 */
export async function findOrCreateUser(email: string, name: string) {
  const normalized = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });
  if (existing) return existing;

  // Contraseña aleatoria no usable (el acceso es por magic link)
  const randomPassword = await hashPassword(
    `${Date.now()}-${Math.random().toString(36)}`
  );
  return prisma.user.create({
    data: { email: normalized, name: name || normalized.split("@")[0], password: randomPassword },
  });
}
