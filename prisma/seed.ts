import { PrismaClient } from "@prisma/client";
import { courses } from "../src/lib/courses";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando cursos...");

  for (const course of courses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        category: course.category,
        icon: course.icon,
        shortDescription: course.shortDescription,
        description: course.description,
        price: course.price,
        originalPrice: course.originalPrice,
        rating: course.rating,
        reviews: course.reviews,
        students: course.students,
        weeks: course.weeks,
        lessons: course.lessons,
        badge: course.badge ?? null,
        evolmindCourseId: course.evolmindCourseId,
        evolmindSynced: Boolean(course.evolmindCourseId),
      },
      create: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        category: course.category,
        icon: course.icon,
        shortDescription: course.shortDescription,
        description: course.description,
        price: course.price,
        originalPrice: course.originalPrice,
        rating: course.rating,
        reviews: course.reviews,
        students: course.students,
        weeks: course.weeks,
        lessons: course.lessons,
        badge: course.badge ?? null,
        evolmindCourseId: course.evolmindCourseId,
        evolmindSynced: Boolean(course.evolmindCourseId),
      },
    });
    console.log(`  ✓ ${course.slug}`);
  }

  // Reajusta la secuencia de autoincremento tras insertar ids explícitos,
  // para que los cursos creados luego (admin) no colisionen en el id.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('courses','id'), (SELECT MAX(id) FROM courses));`
  );

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
