import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMagicToken, createSession } from "@/lib/auth";

/**
 * GET /api/auth/magic?token=...
 * Verifica el enlace mágico, crea la sesión y redirige a /cuenta.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=magic", siteUrl));
  }

  const userId = await verifyMagicToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=expired", siteUrl));
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", siteUrl));
  }

  await createSession({ userId: user.id, email: user.email, name: user.name });
  return NextResponse.redirect(new URL("/cuenta", siteUrl));
}
