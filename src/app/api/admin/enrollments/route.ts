import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

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

  const [enrollments, total, syncedCount] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: {
        course: { select: { title: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { evolmindSynced: true } }),
  ]);

  const data = enrollments.map((e) => ({
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
  }));

  return NextResponse.json({
    enrollments: data,
    stats: { total, synced: syncedCount, pending: total - syncedCount },
  });
}
