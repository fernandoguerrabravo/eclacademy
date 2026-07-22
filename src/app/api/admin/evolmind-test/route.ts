import { NextRequest, NextResponse } from "next/server";
import { enrollStudent, isEvolmindConfigured } from "@/lib/evolmind";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/evolmind-test
 * Prueba una matrícula real contra Evolmind sin pasar por un pago.
 * Protegido con ADMIN_TOKEN (header Bearer o cookie de sesión admin).
 * Body: { email, name, groupid }
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { email, name, groupid } = await req.json();
  if (!email) {
    return NextResponse.json(
      { error: "email es requerido" },
      { status: 400 }
    );
  }

  const result = await enrollStudent({
    email,
    name: name || "Test Student",
    groupid: groupid ? Number(groupid) : undefined,
    externalId: "manual-test",
  });

  return NextResponse.json({
    configured: isEvolmindConfigured(),
    result,
  });
}
