import { prisma } from "@/lib/prisma";
import { enrollStudent } from "@/lib/evolmind";

/**
 * Sincroniza una matrícula (Enrollment) con Evolmind y actualiza su estado.
 * Idempotente: si ya está sincronizada, no repite la llamada.
 */
export async function syncEnrollmentToEvolmind(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true },
  });

  if (!enrollment) {
    return { success: false, message: "Matrícula no encontrada" };
  }

  if (enrollment.evolmindSynced) {
    return { success: true, message: "Ya estaba sincronizada" };
  }

  const result = await enrollStudent({
    email: enrollment.email,
    name: enrollment.email.split("@")[0], // fallback si no hay nombre
    evolmindCourseId: enrollment.course.evolmindCourseId,
    paymentReference: enrollment.orderId ?? undefined,
  });

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      evolmindSynced: result.success,
      evolmindEnrollmentId: result.enrollmentId ?? enrollment.evolmindEnrollmentId,
      evolmindError: result.success ? null : result.message.slice(0, 500),
      evolmindSyncedAt: result.success ? new Date() : null,
      syncAttempts: { increment: 1 },
    },
  });

  return result;
}

/**
 * Crea (si no existe) una matrícula para un usuario/invitado y la sincroniza.
 * Devuelve la matrícula actualizada.
 */
export async function createAndSyncEnrollment(params: {
  userId: string | null;
  courseId: number;
  orderId: string;
  email: string;
  name: string;
}) {
  let enrollment;

  if (params.userId) {
    enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: params.userId, courseId: params.courseId },
      },
      update: { orderId: params.orderId, status: "active" },
      create: {
        userId: params.userId,
        courseId: params.courseId,
        orderId: params.orderId,
        email: params.email,
        status: "active",
      },
    });
  } else {
    enrollment = await prisma.enrollment.create({
      data: {
        courseId: params.courseId,
        orderId: params.orderId,
        email: params.email,
        status: "active",
      },
    });
  }

  await syncEnrollmentToEvolmind(enrollment.id);
  return enrollment;
}

/** Reintenta todas las matrículas no sincronizadas (job / endpoint admin). */
export async function retryPendingEnrollments(limit = 50) {
  const pending = await prisma.enrollment.findMany({
    where: { evolmindSynced: false },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const e of pending) {
    const r = await syncEnrollmentToEvolmind(e.id);
    results.push({ enrollmentId: e.id, ...r });
  }
  return results;
}
