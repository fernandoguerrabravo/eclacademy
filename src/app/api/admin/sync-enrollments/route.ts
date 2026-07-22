import { NextRequest, NextResponse } from "next/server";
import { retryPendingEnrollments } from "@/lib/enrollments";

/**
 * POST /api/admin/sync-enrollments
 * Reintenta sincronizar con Evolmind las matrículas pendientes.
 * Protegido con ADMIN_TOKEN (header: Authorization: Bearer <token>).
 */
export async function POST(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN no configurado" },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = await retryPendingEnrollments();
  const synced = results.filter((r) => r.success).length;

  return NextResponse.json({
    processed: results.length,
    synced,
    failed: results.length - synced,
    results,
  });
}
