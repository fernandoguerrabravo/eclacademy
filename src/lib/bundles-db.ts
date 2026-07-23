import { prisma } from "@/lib/prisma";

export interface StoreBundle {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: string;
  price: number;
  originalPrice: number;
  courses: { id: number; title: string; slug: string; icon: string }[];
}

/** Paquetes publicados para la tienda. Solo incluye si tiene cursos. */
export async function getStoreBundles(): Promise<StoreBundle[]> {
  const bundles = await prisma.bundle.findMany({
    where: { published: true },
    include: { courses: { include: { course: true } } },
    orderBy: { id: "asc" },
  });
  return bundles
    .filter((b) => b.courses.length > 0)
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      shortDescription: b.shortDescription,
      description: b.description,
      icon: b.icon,
      price: b.price,
      originalPrice: b.originalPrice,
      courses: b.courses.map((bc) => ({
        id: bc.course.id,
        title: bc.course.title,
        slug: bc.course.slug,
        icon: bc.course.icon,
      })),
    }));
}

export async function getStoreBundleBySlug(
  slug: string
): Promise<StoreBundle | null> {
  const b = await prisma.bundle.findUnique({
    where: { slug },
    include: { courses: { include: { course: true } } },
  });
  if (!b || !b.published) return null;
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    shortDescription: b.shortDescription,
    description: b.description,
    icon: b.icon,
    price: b.price,
    originalPrice: b.originalPrice,
    courses: b.courses.map((bc) => ({
      id: bc.course.id,
      title: bc.course.title,
      slug: bc.course.slug,
      icon: bc.course.icon,
    })),
  };
}
