import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCoursesFromEvolmind } from "@/lib/courses-sync";

/**
 * Gestión de cursos. evolCampus es la fuente de verdad del catálogo.
 * Protegido con ADMIN_TOKEN.
 *
 * GET   /api/admin/courses  -> lista los cursos locales con su estado
 * POST  /api/admin/courses  -> sincroniza el catálogo desde evolCampus
 * PATCH /api/admin/courses  -> edita precio/presentación/publicación de un curso
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
      originalPrice: true,
      published: true,
      active: true,
      evolmindCourseId: true,
      evolmindGroupId: true,
      evolmindSynced: true,
      evolmindError: true,
    },
  });
  return NextResponse.json({ courses });
}

// POST -> sincroniza el catálogo desde evolCampus (fuente de verdad)
export async function POST(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await syncCoursesFromEvolmind();
    return NextResponse.json({
      ok: true,
      ...result,
      note: "Los cursos nuevos se crean con precio 0 y sin publicar. Configura precio y publica con PATCH.",
    });
  } catch (error) {
    console.error("[admin:courses:POST sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al sincronizar" },
      { status: 502 }
    );
  }
}

// PATCH -> edita datos de comercio/presentación de un curso local
export async function PATCH(req: NextRequest) {
  const unauthorized = authorize(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const courseId = Number(body.courseId);
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId es requerido" },
        { status: 400 }
      );
    }

    // Solo campos de comercio/presentación son editables aquí.
    const data: Record<string, unknown> = {};
    const allowed = [
      "slug",
      "title",
      "category",
      "icon",
      "shortDescription",
      "description",
      "badge",
    ] as const;
    for (const f of allowed) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.originalPrice !== undefined)
      data.originalPrice = Number(body.originalPrice);
    if (body.weeks !== undefined) data.weeks = Number(body.weeks);
    if (body.lessons !== undefined) data.lessons = Number(body.lessons);
    if (body.published !== undefined) data.published = Boolean(body.published);

    // No se permite publicar un curso sin grupo de evolCampus (no matriculable)
    if (data.published === true) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course?.evolmindGroupId) {
        return NextResponse.json(
          {
            error:
              "No se puede publicar: el curso no está enlazado con un grupo de evolCampus. Sincroniza primero.",
          },
          { status: 409 }
        );
      }
      const effectivePrice =
        typeof data.price === "number" ? data.price : course.price;
      if (effectivePrice <= 0) {
        return NextResponse.json(
          { error: "No se puede publicar un curso con precio 0." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
    });
    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error("[admin:courses:PATCH] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el curso" },
      { status: 500 }
    );
  }
}
