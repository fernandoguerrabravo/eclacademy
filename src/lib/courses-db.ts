import { prisma } from "@/lib/prisma";
import type { Course as PrismaCourse } from "@prisma/client";

/** Forma del curso que consume la UI de la tienda. */
export interface StoreCourse {
  id: number;
  slug: string;
  title: string;
  category: string;
  icon: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  students: number;
  weeks: number;
  lessons: number;
  badge: string | null;
  subjects: { subjectid: number | string; subject: string }[];
  whatYouLearn: string[];
  requirements: string[];
  audience: string[];
}

function toStoreCourse(c: PrismaCourse): StoreCourse {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    icon: c.icon,
    shortDescription: c.shortDescription,
    description: c.description,
    price: c.price,
    originalPrice: c.originalPrice,
    rating: c.rating,
    reviews: c.reviews,
    students: c.students,
    weeks: c.weeks,
    lessons: c.lessons,
    badge: c.badge,
    subjects: Array.isArray(c.subjects) ? (c.subjects as any) : [],
    whatYouLearn: c.whatYouLearn ?? [],
    requirements: c.requirements ?? [],
    audience: c.audience ?? [],
  };
}

/** Cursos visibles en la tienda: publicados, activos y matriculables. */
export async function getStoreCourses(): Promise<StoreCourse[]> {
  const courses = await prisma.course.findMany({
    where: {
      published: true,
      active: true,
      NOT: { evolmindGroupId: null },
    },
    orderBy: { id: "asc" },
  });
  return courses.map(toStoreCourse);
}

/** Detalle de un curso publicado por slug. */
export async function getStoreCourseBySlug(
  slug: string
): Promise<StoreCourse | null> {
  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course || !course.published || !course.active) return null;
  return toStoreCourse(course);
}

/** Slugs de cursos publicados (para generación estática / sitemap). */
export async function getPublishedSlugs(): Promise<string[]> {
  const courses = await prisma.course.findMany({
    where: { published: true, active: true },
    select: { slug: true },
  });
  return courses.map((c) => c.slug);
}
