import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAutologinUrl } from "@/lib/evolmind";

/**
 * GET /api/enrollments/[id]/access
 * Devuelve una URL de acceso directo (autologin) al curso en evolCampus.
 * Solo el dueño de la matrícula puede solicitarla.
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
    include: { course: true },
  });

  if (!enrollment || enrollment.userId !== session.userId) {
    return NextResponse.json(
      { error: "Matrícula no encontrada" },
      { status: 404 }
    );
  }

  if (!enrollment.evolmindUserId) {
    return NextResponse.json(
      { error: "La matrícula aún no está sincronizada con evolCampus" },
      { status: 409 }
    );
  }

  const url = await getAutologinUrl(enrollment.evolmindUserId, {
    groupId: enrollment.course.evolmindGroupId ?? undefined,
    courseId: enrollment.course.evolmindCourseId ?? undefined,
  });

  if (!url) {
    return NextResponse.json(
      { error: "No se pudo generar el acceso" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url });
}
