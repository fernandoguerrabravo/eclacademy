import { prisma } from "@/lib/prisma";
import { createCourse, isCourseCreateEnabled } from "@/lib/evolmind";

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
  /** Si ya tienes el código del curso en evolCampus, enlázalo directamente. */
  evolmindCourseId?: string | null;
}

/**
 * Crea un curso en la BD y, si la creación por API está habilitada,
 * intenta crearlo también en evolCampus para obtener su código.
 *
 * Escenarios:
 *  1) evolmindCourseId provisto -> se enlaza directamente (synced=true).
 *  2) Creación por API habilitada -> se crea en evolCampus y se guarda el id.
 *  3) Ni lo uno ni lo otro -> curso creado en BD, pendiente de enlace manual.
 */
export async function createCourseWithEvolmind(input: CreateCourseInput) {
  let evolmindCourseId: string | null = input.evolmindCourseId ?? null;
  let evolmindSynced = false;
  let evolmindError: string | null = null;

  if (evolmindCourseId) {
    // Escenario 1: enlace manual directo
    evolmindSynced = true;
  } else if (isCourseCreateEnabled()) {
    // Escenario 2: crear en evolCampus
    const result = await createCourse({
      name: input.title,
      code: input.slug,
      description: input.shortDescription,
    });
    if (result.success && result.evolmindCourseId) {
      evolmindCourseId = result.evolmindCourseId;
      evolmindSynced = true;
    } else {
      evolmindError = result.message;
    }
  } else {
    // Escenario 3: pendiente de enlace manual
    evolmindError =
      "Pendiente: crea el curso en evolCampus y enlaza su código.";
  }

  const course = await prisma.course.create({
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
      evolmindSynced,
      evolmindError,
    },
  });

  return course;
}

/**
 * Reintenta crear/enlazar en evolCampus los cursos que aún no están sincronizados.
 */
export async function retryPendingCourses() {
  const pending = await prisma.course.findMany({
    where: { evolmindSynced: false, active: true },
  });

  const results = [];
  for (const c of pending) {
    if (!isCourseCreateEnabled()) {
      results.push({
        courseId: c.id,
        success: false,
        message: "Creación por API no habilitada",
      });
      continue;
    }
    const result = await createCourse({
      name: c.title,
      code: c.slug,
      description: c.shortDescription,
    });
    await prisma.course.update({
      where: { id: c.id },
      data: {
        evolmindCourseId: result.evolmindCourseId ?? c.evolmindCourseId,
        evolmindSynced: result.success,
        evolmindError: result.success ? null : result.message.slice(0, 500),
      },
    });
    results.push({ courseId: c.id, ...result });
  }
  return results;
}
