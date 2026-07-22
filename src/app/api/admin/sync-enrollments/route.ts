import { NextRequest, NextResponse } from "next/server";
import { retryPendingEnrollments } from "@/lib/enrollments";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/sync-enrollments
 * Reintenta sincronizar con Evolmind las matrículas pendientes.
 * Protegido con ADMIN_TOKEN (header Bearer o cookie de sesión admin).
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
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
