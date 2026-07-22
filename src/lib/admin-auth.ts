import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 8; // 8 horas

/** Autoriza una petición API admin por header Bearer o cookie de sesión. */
export function isAdminRequest(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${token}`) return true;

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(cookie) && cookie === token;
}

/** Comprueba la sesión admin en Server Components (vía cookies()). */
export function isAdminServer(): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return cookies().get(ADMIN_COOKIE)?.value === token;
}

export function setAdminCookie(): void {
  cookies().set(ADMIN_COOKIE, process.env.ADMIN_TOKEN || "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminCookie(): void {
  cookies().delete(ADMIN_COOKIE);
}
