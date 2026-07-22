import { prisma } from "@/lib/prisma";
import { enrollStudent } from "@/lib/evolmind";

/**
 * Sincroniza una matrícula (Enrollment) con evolCampus y actualiza su estado.
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

  // Para matricular en evolCampus se necesita el grupo (enroll[groupid]).
  if (!enrollment.course.evolmindGroupId) {
    const message =
      "El curso no está enlazado con evolCampus (falta evolmindGroupId). Enlázalo primero.";
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        evolmindSynced: false,
        evolmindError: message,
        syncAttempts: { increment: 1 },
      },
    });
    return { success: false, message };
  }

  const result = await enrollStudent({
    email: enrollment.email,
    name: enrollment.studentName || enrollment.email.split("@")[0],
    groupid: enrollment.course.evolmindGroupId,
    externalId: enrollment.orderId ?? undefined,
    welcomeEmail: true,
  });

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      evolmindSynced: result.success,
      evolmindEnrollmentId:
        result.enrollmentId ?? enrollment.evolmindEnrollmentId,
      evolmindUserId: result.userId ?? enrollment.evolmindUserId,
      evolmindError: result.success ? null : result.message.slice(0, 500),
      evolmindSyncedAt: result.success ? new Date() : null,
      syncAttempts: { increment: 1 },
    },
  });

  return result;
}

/**
 * Crea (si no existe) una matrícula para un usuario/invitado y la sincroniza.
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
      update: {
        orderId: params.orderId,
        status: "active",
        studentName: params.name,
      },
      create: {
        userId: params.userId,
        courseId: params.courseId,
        orderId: params.orderId,
        email: params.email,
        studentName: params.name,
        status: "active",
      },
    });
  } else {
    enrollment = await prisma.enrollment.create({
      data: {
        courseId: params.courseId,
        orderId: params.orderId,
        email: params.email,
        studentName: params.name,
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
