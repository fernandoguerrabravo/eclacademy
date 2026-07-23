import { prisma } from "@/lib/prisma";
import { createCompany } from "@/lib/evolmind";
import { findOrCreateUser, createMagicToken } from "@/lib/auth";
import { syncEnrollmentToEvolmind } from "@/lib/enrollments";
import { sendEmail, enrollmentEmail } from "@/lib/email";

/**
 * Crea una empresa localmente y en evolCampus (para asociar alumnos B2B).
 */
export async function createCompanyWithEvolmind(params: {
  name: string;
  documentId?: string;
  contactEmail?: string;
}) {
  const result = await createCompany({
    name: params.name,
    documentId: params.documentId,
  });

  return prisma.company.create({
    data: {
      name: params.name,
      documentId: params.documentId,
      contactEmail: params.contactEmail,
      evolmindCompanyId: result.success ? result.companyId : null,
    },
  });
}

export interface BulkStudent {
  email: string;
  name?: string;
}

export interface BulkEnrollResult {
  email: string;
  success: boolean;
  message: string;
}

/**
 * Matricula en bloque a empleados de una empresa en un curso.
 * Crea cuenta si no existe, matricula en evolCampus (con companyId) y
 * envía el email de acceso a cada uno.
 */
export async function bulkEnrollCompany(params: {
  companyId: number;
  courseId: number;
  students: BulkStudent[];
}): Promise<BulkEnrollResult[]> {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
  });
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
  });

  const results: BulkEnrollResult[] = [];
  if (!company || !course) {
    return params.students.map((s) => ({
      email: s.email,
      success: false,
      message: "Empresa o curso no encontrado",
    }));
  }
  if (!course.evolmindGroupId) {
    return params.students.map((s) => ({
      email: s.email,
      success: false,
      message: "El curso no está enlazado con evolCampus",
    }));
  }

  for (const s of params.students) {
    const email = s.email.toLowerCase().trim();
    if (!email) continue;
    try {
      const name = s.name || email.split("@")[0];
      const user = await findOrCreateUser(email, name);

      const enrollment = await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        update: { companyId: company.id, status: "active", studentName: name },
        create: {
          userId: user.id,
          courseId: course.id,
          companyId: company.id,
          email,
          studentName: name,
          status: "active",
        },
      });

      const sync = await syncEnrollmentToEvolmind(enrollment.id);

      // Email de acceso
      const token = await createMagicToken(user.id);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const accessUrl = `${siteUrl}/api/auth/magic?token=${encodeURIComponent(token)}`;
      const { subject, html } = enrollmentEmail({
        name,
        courses: [course.title],
        accessUrl,
      });
      await sendEmail({ to: email, subject, html });

      results.push({
        email,
        success: sync.success,
        message: sync.success ? "Matriculado" : sync.message,
      });
    } catch (err) {
      results.push({
        email,
        success: false,
        message: err instanceof Error ? err.message : "Error",
      });
    }
  }

  return results;
}
