import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCourseWithEvolmind } from "@/lib/courses-service";

/**
 * Gestión administrativa de cursos. Protegido con ADMIN_TOKEN.
 *
 * GET  /api/admin/courses  -> lista cursos con su estado de sync
 * POST /api/admin/courses  -> crea un curso (y lo enlaza/crea en evolCampus)
 */

function authorize(req: NextRequest): NextResponse | null {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN no configurado" },
      { status: 503 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  const courses = await prisma.course.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      active: true,
      evolmindCourseId: true,
      evolmindSynced: true,
      evolmindError: true,
    },
  });
  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const required = [
      "slug",
      "title",
      "category",
      "icon",
      "shortDescription",
      "description",
      "price",
      "originalPrice",
    ];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        return NextResponse.json(
          { error: `Campo requerido: ${f}` },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.course.findUnique({
      where: { slug: body.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un curso con ese slug" },
        { status: 409 }
      );
    }

    const course = await createCourseWithEvolmind({
      slug: body.slug,
      title: body.title,
      category: body.category,
      icon: body.icon,
      shortDescription: body.shortDescription,
      description: body.description,
      price: Number(body.price),
      originalPrice: Number(body.originalPrice),
      weeks: body.weeks ? Number(body.weeks) : undefined,
      lessons: body.lessons ? Number(body.lessons) : undefined,
      badge: body.badge ?? null,
      evolmindCourseId: body.evolmindCourseId ?? null,
    });

    return NextResponse.json({
      course,
      evolmindLinked: course.evolmindSynced,
      note: course.evolmindSynced
        ? "Curso creado y enlazado con evolCampus."
        : "Curso creado en la BD. Pendiente de enlazar con evolCampus (crea el curso allí y actualiza evolmindCourseId).",
    });
  } catch (error) {
    console.error("[admin:courses:POST] Error:", error);
    return NextResponse.json(
      { error: "Error al crear el curso" },
      { status: 500 }
    );
  }
}
