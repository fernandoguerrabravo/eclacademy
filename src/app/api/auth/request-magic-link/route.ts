import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMagicToken } from "@/lib/auth";
import { sendEmail, magicLinkEmail } from "@/lib/email";

/**
 * POST /api/auth/request-magic-link  body: { email }
 * Envía un enlace de acceso al email si existe una cuenta.
 * Responde siempre 200 (no revela si el email existe).
 */
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const normalized = String(email).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (user) {
    const token = await createMagicToken(user.id);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const url = `${siteUrl}/api/auth/magic?token=${encodeURIComponent(token)}`;
    const { subject, html } = magicLinkEmail({ name: user.name, url });
    await sendEmail({ to: user.email, subject, html });
  }

  // Respuesta genérica siempre
  return NextResponse.json({ ok: true });
}
