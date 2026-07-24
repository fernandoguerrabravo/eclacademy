import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { generateDiscountCodes } from "@/lib/discounts";

function auth(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

// GET -> lista de códigos
export async function GET(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const now = new Date();
  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      percent: c.percent,
      campaign: c.campaign,
      used: c.usedCount >= c.maxUses,
      usedByEmail: c.usedByEmail,
      usedAt: c.usedAt,
      active: c.active,
      expired: c.expiresAt ? c.expiresAt < now : false,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    })),
  });
}

// POST -> generar códigos { percent, quantity, campaign?, expiresInDays?, prefix? }
export async function POST(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  try {
    const b = await req.json();
    const percent = Number(b.percent);
    const quantity = Math.min(Math.max(Number(b.quantity) || 1, 1), 200);
    if (!percent || percent < 1 || percent > 100) {
      return NextResponse.json(
        { error: "El porcentaje debe estar entre 1 y 100" },
        { status: 400 }
      );
    }
    const expiresAt = b.expiresInDays
      ? new Date(Date.now() + Number(b.expiresInDays) * 86400000)
      : null;

    const codes = await generateDiscountCodes({
      percent,
      quantity,
      campaign: b.campaign || undefined,
      expiresAt,
      prefix: b.prefix || undefined,
    });
    return NextResponse.json({ codes, count: codes.length });
  } catch (e) {
    console.error("[admin:discounts:POST]", e);
    return NextResponse.json({ error: "Error al generar códigos" }, { status: 500 });
  }
}

// PATCH -> activar/desactivar { id, active }
export async function PATCH(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const { id, active } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const code = await prisma.discountCode.update({
    where: { id: Number(id) },
    data: { active: Boolean(active) },
  });
  return NextResponse.json({ code });
}

// DELETE ?id= -> eliminar
export async function DELETE(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.discountCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
