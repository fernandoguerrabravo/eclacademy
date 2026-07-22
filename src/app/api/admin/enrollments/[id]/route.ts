import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { getEnrollmentProgress, extendEnrollmentTime } from "@/lib/evolmind";

/** GET /api/admin/enrollments/[id] -> progreso de la matrícula (evolCampus). */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.id },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  if (!enrollment.evolmindEnrollmentId) {
    return NextResponse.json({ progress: null });
  }
  const progress = await getEnrollmentProgress(
    Number(enrollment.evolmindEnrollmentId)
  );
  return NextResponse.json({ progress });
}

/**
 * POST /api/admin/enrollments/[id]  body: { days } | { date }
 * Amplía la fecha fin de la matrícula (cursos asíncronos).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.id },
  });
  if (!enrollment?.evolmindEnrollmentId) {
    return NextResponse.json(
      { error: "Matrícula no sincronizada con evolCampus" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const days = body.days ? Number(body.days) : undefined;
  const date = body.date as string | undefined;
  if (!days && !date) {
    return NextResponse.json(
      { error: "Indica 'days' o 'date'" },
      { status: 400 }
    );
  }

  const result = await extendEnrollmentTime(
    Number(enrollment.evolmindEnrollmentId),
    { days, date }
  );
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: result.message });
}
