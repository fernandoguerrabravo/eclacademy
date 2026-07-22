import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

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
    await sendEmail({
      to: user.email,
      subject: "Tu enlace de acceso a ECL Academy",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1c1d1f;">
          <h1 style="font-size:20px;">Acceso a ECL Academy</h1>
          <p>Hola ${user.name}, entra a tu cuenta con este enlace (sin contraseña):</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${url}" style="background:#ff9900;color:#1c1d1f;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;display:inline-block;">Acceder</a>
          </p>
          <p style="font-size:12px;color:#6a6f73;">Válido por 7 días. Si no lo solicitaste, ignora este correo.</p>
        </div>
      `,
    });
  }

  // Respuesta genérica siempre
  return NextResponse.json({ ok: true });
}
