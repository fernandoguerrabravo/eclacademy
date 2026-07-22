import { prisma } from "@/lib/prisma";
import { getEvolmindCoursesWithGroups } from "@/lib/evolmind";

/** Genera un slug a partir del nombre del curso. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base || "curso";
  let i = 1;
  // Evita colisiones de slug
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i++}`;
  }
}

export interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
  courses: { evolmindCourseId: number; name: string; action: string }[];
}

/**
 * Sincroniza el catálogo local con evolCampus (fuente de verdad).
 *
 * - Crea cursos nuevos (con precio 0 y published=false hasta que el admin
 *   configure precio y presentación).
 * - Actualiza el vínculo (grupo, estado, asignaturas) de los existentes,
 *   preservando los datos de comercio locales (precio, slug, icono, textos).
 * - Desactiva los cursos locales que ya no existen en evolCampus.
 */
export async function syncCoursesFromEvolmind(): Promise<SyncResult> {
  const evoCourses = await getEvolmindCoursesWithGroups();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    deactivated: 0,
    courses: [],
  };

  const seenEvolmindIds: number[] = [];

  for (const evo of evoCourses) {
    seenEvolmindIds.push(evo.id);
    const firstGroup = evo.groups?.[0];
    const evolmindGroupId =
      firstGroup?.groupid != null ? Number(firstGroup.groupid) : null;
    const isActive = evo.status === "ACTIVE";
    const subjects = evo.subjects ?? [];

    const existing = await prisma.course.findFirst({
      where: { evolmindCourseId: evo.id },
    });

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          title: evo.name,
          evolmindGroupId,
          subjects,
          active: isActive,
          evolmindSynced: Boolean(evolmindGroupId),
          evolmindError: evolmindGroupId
            ? null
            : "El curso en evolCampus no tiene grupo activo para matricular.",
        },
      });
      result.updated++;
      result.courses.push({ evolmindCourseId: evo.id, name: evo.name, action: "updated" });
    } else {
      const slug = await uniqueSlug(slugify(evo.name));
      await prisma.course.create({
        data: {
          slug,
          title: evo.name,
          category: evo.tags?.[0] || "General",
          icon: "fa-graduation-cap",
          shortDescription: evo.name,
          description: evo.name,
          price: 0,
          originalPrice: 0,
          evolmindCourseId: evo.id,
          evolmindGroupId,
          subjects,
          active: isActive,
          evolmindSynced: Boolean(evolmindGroupId),
          evolmindError: evolmindGroupId
            ? null
            : "El curso en evolCampus no tiene grupo activo para matricular.",
          published: false, // requiere que el admin fije precio y publique
        },
      });
      result.created++;
      result.courses.push({ evolmindCourseId: evo.id, name: evo.name, action: "created" });
    }
  }

  // Desactiva y despublica los cursos locales enlazados que ya no están en evolCampus
  const orphans = await prisma.course.updateMany({
    where: {
      evolmindCourseId: { notIn: seenEvolmindIds.length ? seenEvolmindIds : [-1] },
      active: true,
      NOT: { evolmindCourseId: null },
    },
    data: { active: false, published: false },
  });
  result.deactivated = orphans.count;

  return result;
}
