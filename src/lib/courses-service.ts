import { prisma } from "@/lib/prisma";

export interface CreateCourseInput {
  slug: string;
  title: string;
  category: string;
  icon: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice: number;
  weeks?: number;
  lessons?: number;
  badge?: string | null;
  /** id del curso en evolCampus (getCourses) */
  evolmindCourseId?: number | null;
  /** id del grupo en evolCampus (getCourseGroups) para matricular */
  evolmindGroupId?: number | null;
}

/**
 * Crea un curso en la BD y lo enlaza con evolCampus.
 *
 * NOTA: evolCampus NO permite crear cursos por API (se crean en su editor).
 * El flujo correcto es: crear el curso allí, y aquí enlazar su `id` y el
 * `groupid` del grupo donde se matriculará a los alumnos.
 *
 * Un curso se considera "sincronizado" cuando tiene evolmindGroupId
 * (imprescindible para poder matricular vía newEnrollment).
 */
export async function createCourseWithEvolmind(input: CreateCourseInput) {
  const evolmindGroupId = input.evolmindGroupId ?? null;
  const evolmindCourseId = input.evolmindCourseId ?? null;
  const evolmindSynced = Boolean(evolmindGroupId);
  const evolmindError = evolmindSynced
    ? null
    : "Pendiente: enlaza el curso con evolCampus (evolmindGroupId) para poder matricular.";

  return prisma.course.create({
    data: {
      slug: input.slug,
      title: input.title,
      category: input.category,
      icon: input.icon,
      shortDescription: input.shortDescription,
      description: input.description,
      price: input.price,
      originalPrice: input.originalPrice,
      weeks: input.weeks ?? 0,
      lessons: input.lessons ?? 0,
      badge: input.badge ?? null,
      evolmindCourseId,
      evolmindGroupId,
      evolmindSynced,
      evolmindError,
    },
  });
}

/** Enlaza (o reenlaza) un curso existente con evolCampus. */
export async function linkCourseToEvolmind(
  courseId: number,
  evolmindCourseId: number,
  evolmindGroupId: number
) {
  return prisma.course.update({
    where: { id: courseId },
    data: {
      evolmindCourseId,
      evolmindGroupId,
      evolmindSynced: true,
      evolmindError: null,
    },
  });
}
