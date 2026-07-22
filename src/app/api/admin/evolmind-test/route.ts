import { NextRequest, NextResponse } from "next/server";
import { enrollStudent, isEvolmindConfigured } from "@/lib/evolmind";

/**
 * POST /api/admin/evolmind-test
 * Prueba una matrícula real contra Evolmind sin pasar por un pago.
 * Útil al configurar las credenciales de evolCampus.
 *
 * Protegido con ADMIN_TOKEN.
 * Body: { email, name, evolmindCourseId }
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

  const { email, name, evolmindCourseId } = await req.json();
  if (!email || !evolmindCourseId) {
    return NextResponse.json(
      { error: "email y evolmindCourseId son requeridos" },
      { status: 400 }
    );
  }

  const result = await enrollStudent({
    email,
    name: name || "Test Student",
    evolmindCourseId,
    paymentReference: "manual-test",
  });

  return NextResponse.json({
    configured: isEvolmindConfigured(),
    result,
  });
}
