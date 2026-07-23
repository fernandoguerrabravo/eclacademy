import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { getEnrollmentsByGroup } from "@/lib/evolmind";

/**
 * GET /api/admin/enrollments
 * Lista las matrículas con datos del alumno y del curso.
 * Filtros opcionales: ?search=texto  &courseId=ID  &synced=true|false
 * Protegido con ADMIN_TOKEN.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const courseId = sp.get("courseId");
  const synced = sp.get("synced");

  const where: any = {};
  if (courseId) where.courseId = Number(courseId);
  if (synced === "true") where.evolmindSynced = true;
  if (synced === "false") where.evolmindSynced = false;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { studentName: { contains: search, mode: "insensitive" } },
    ];
  }

  const withProgress = sp.get("withProgress") === "1";

  const [enrollments, total, syncedCount] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        course: { select: { title: true, slug: true, evolmindGroupId: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { evolmindSynced: true } }),
  ]);

  // Enriquecimiento de progreso en bloque: una llamada por grupo de evolCampus
  const progressByEnrollmentId = new Map<number, { completedPercent: number; grade: number; diplomaUrl: string | null }>();
  if (withProgress) {
    const groupIds = Array.from(
      new Set(
        enrollments
          .map((e) => e.course.evolmindGroupId)
          .filter((g): g is number => Boolean(g))
      )
    );
    for (const gid of groupIds) {
      const map = await getEnrollmentsByGroup(gid);
      for (const [eid, row] of map) progressByEnrollmentId.set(eid, row);
    }
  }

  let completed = 0;
  let progressSum = 0;
  let progressCount = 0;

  const data = enrollments.map((e) => {
    const evId = e.evolmindEnrollmentId ? Number(e.evolmindEnrollmentId) : null;
    const p = evId ? progressByEnrollmentId.get(evId) : undefined;
    if (p) {
      progressCount++;
      progressSum += p.completedPercent;
      if (p.completedPercent >= 100) completed++;
    }
    return {
      id: e.id,
      email: e.email,
      name: e.studentName || e.user?.name || null,
      course: e.course.title,
      courseSlug: e.course.slug,
      status: e.status,
      registered: Boolean(e.userId),
      evolmindSynced: e.evolmindSynced,
      evolmindEnrollmentId: e.evolmindEnrollmentId,
      evolmindUserId: e.evolmindUserId,
      evolmindError: e.evolmindError,
      orderId: e.orderId,
      createdAt: e.createdAt,
      completedPercent: p ? Math.round(p.completedPercent) : null,
      grade: p ? p.grade : null,
      diplomaUrl: p ? p.diplomaUrl : null,
    };
  });

  return NextResponse.json({
    enrollments: data,
    stats: {
      total,
      synced: syncedCount,
      pending: total - syncedCount,
      completed: withProgress ? completed : null,
      avgProgress:
        withProgress && progressCount > 0
          ? Math.round(progressSum / progressCount)
          : null,
    },
  });
}
