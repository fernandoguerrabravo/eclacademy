import { prisma } from "@/lib/prisma";
import {
  getEvolmindCourses,
  getEvolmindCoursesWithGroups,
} from "@/lib/evolmind";

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
  // Fuente base: TODOS los cursos (incluye los que aún no tienen grupo).
  // getCoursesGroups solo devuelve cursos con grupos, así que lo usamos para
  // enriquecer (grupos/tags/asignaturas) pero no como lista principal.
  const [allCourses, withGroups] = await Promise.all([
    getEvolmindCourses(),
    getEvolmindCoursesWithGroups(),
  ]);

  const groupsById = new Map<number, (typeof withGroups)[number]>();
  for (const g of withGroups) groupsById.set(g.id, g);

  // Unión por id: base = todos los cursos; si alguno solo aparece en withGroups
  // (por si acaso), también se incluye.
  const merged = new Map<
    number,
    { id: number; name: string; status: string; groups?: { groupid: number }[]; tags?: string[]; subjects?: { subjectid: number | string; subject: string }[] }
  >();
  for (const c of allCourses) {
    const enrich = groupsById.get(c.id);
    merged.set(c.id, {
      id: c.id,
      name: c.name,
      status: c.status,
      groups: enrich?.groups,
      tags: enrich?.tags,
      // IMPORTANTE: las asignaturas se toman de getCourses (c.subjects), que
      // RESPETA las archivadas (las excluye). getCoursesGroups las sigue
      // devolviendo, así que NO lo usamos para el temario.
      subjects: c.subjects,
    });
  }
  for (const g of withGroups) {
    if (!merged.has(g.id)) {
      merged.set(g.id, {
        id: g.id,
        name: g.name,
        status: g.status,
        groups: g.groups,
        tags: g.tags,
        subjects: g.subjects,
      });
    }
  }
  const evoCourses = Array.from(merged.values());

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

    // Nombres de asignaturas de evolCampus (para sembrar el temario local).
    const subjectNames = (subjects as { subject?: string }[])
      .map((s) => (s?.subject ? String(s.subject) : ""))
      .filter(Boolean);

    const existing = await prisma.course.findFirst({
      where: { evolmindCourseId: evo.id },
    });

    if (existing) {
      const data: Record<string, unknown> = {
        title: evo.name,
        evolmindGroupId,
        subjects,
        active: isActive,
        evolmindSynced: Boolean(evolmindGroupId),
        evolmindError: evolmindGroupId
          ? null
          : "El curso en evolCampus no tiene grupo activo para matricular.",
      };
      // evolCampus es la fuente de verdad del temario: espejamos el temario
      // (curriculum) desde getCourses en CADA sincronización. Así, archivar o
      // borrar una asignatura en evolCampus se refleja aquí al sincronizar.
      data.curriculum = subjectNames;
      await prisma.course.update({ where: { id: existing.id }, data });
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
          curriculum: subjectNames, // temario inicial (editable en nuestro admin)
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
