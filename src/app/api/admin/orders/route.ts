import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * GET /api/admin/orders — lista de órdenes con ítems y métricas de ventas.
 * Filtros: ?status=PAID|PENDING|FAILED|REFUNDED
 * Protegido con ADMIN_TOKEN.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;

  const [orders, paid] = await Promise.all([
    prisma.order.findMany({
      where: status ? { status: status as any } : undefined,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.order.findMany({
      where: { status: "PAID" },
      select: { total: true },
    }),
  ]);

  const revenue = paid.reduce((sum, o) => sum + o.total, 0);

  const byStatus = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const g of byStatus) counts[g.status] = g._count._all;

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      email: o.email,
      status: o.status,
      total: o.total,
      currency: o.currency,
      createdAt: o.createdAt,
      items: o.items.map((it) => ({ title: it.title, price: it.price })),
    })),
    stats: {
      revenue,
      paidCount: paid.length,
      counts,
    },
  });
}
