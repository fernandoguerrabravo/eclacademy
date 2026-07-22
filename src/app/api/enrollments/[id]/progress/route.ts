import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEnrollmentProgress } from "@/lib/evolmind";

/**
 * GET /api/enrollments/[id]/progress
 * Devuelve el progreso del alumno en evolCampus para su matrícula.
 * Solo el dueño de la matrícula puede consultarlo.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.id },
  });
  if (!enrollment || enrollment.userId !== session.userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!enrollment.evolmindEnrollmentId) {
    return NextResponse.json({ progress: null });
  }

  const progress = await getEnrollmentProgress(
    Number(enrollment.evolmindEnrollmentId)
  );
  return NextResponse.json({ progress });
}
