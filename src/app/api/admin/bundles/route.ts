import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

function auth(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

// GET -> lista de paquetes con sus cursos
export async function GET(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const bundles = await prisma.bundle.findMany({
    include: { courses: { include: { course: { select: { id: true, title: true } } } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({
    bundles: bundles.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      shortDescription: b.shortDescription,
      description: b.description,
      icon: b.icon,
      price: b.price,
      originalPrice: b.originalPrice,
      published: b.published,
      courseIds: b.courses.map((c) => c.courseId),
      courseTitles: b.courses.map((c) => c.course.title),
    })),
  });
}

// POST -> crear paquete
export async function POST(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  try {
    const b = await req.json();
    for (const f of ["slug", "title", "shortDescription", "description"]) {
      if (!b[f]) return NextResponse.json({ error: `Campo requerido: ${f}` }, { status: 400 });
    }
    const courseIds: number[] = (b.courseIds || []).map((n: any) => Number(n));
    const exists = await prisma.bundle.findUnique({ where: { slug: b.slug } });
    if (exists) return NextResponse.json({ error: "Ya existe un paquete con ese slug" }, { status: 409 });

    const bundle = await prisma.bundle.create({
      data: {
        slug: b.slug,
        title: b.title,
        shortDescription: b.shortDescription,
        description: b.description,
        icon: b.icon || "fa-layer-group",
        price: Number(b.price) || 0,
        originalPrice: Number(b.originalPrice) || 0,
        published: false,
        courses: { create: courseIds.map((id) => ({ courseId: id })) },
      },
    });
    return NextResponse.json({ bundle });
  } catch (e) {
    console.error("[admin:bundles:POST]", e);
    return NextResponse.json({ error: "Error al crear el paquete" }, { status: 500 });
  }
}

// PATCH -> editar paquete (campos + cursos + publicar)
export async function PATCH(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  try {
    const b = await req.json();
    const id = Number(b.id);
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const data: Record<string, unknown> = {};
    for (const f of ["slug", "title", "shortDescription", "description", "icon"]) {
      if (b[f] !== undefined) data[f] = b[f];
    }
    if (b.price !== undefined) data.price = Number(b.price);
    if (b.originalPrice !== undefined) data.originalPrice = Number(b.originalPrice);

    // Actualiza cursos si se envían
    if (Array.isArray(b.courseIds)) {
      await prisma.bundleCourse.deleteMany({ where: { bundleId: id } });
      await prisma.bundleCourse.createMany({
        data: b.courseIds.map((cid: any) => ({ bundleId: id, courseId: Number(cid) })),
        skipDuplicates: true,
      });
    }

    // Publicar: requiere cursos y precio > 0
    if (b.published !== undefined) {
      if (b.published === true) {
        const count = await prisma.bundleCourse.count({ where: { bundleId: id } });
        const current = await prisma.bundle.findUnique({ where: { id } });
        const price = data.price !== undefined ? (data.price as number) : current?.price ?? 0;
        if (count === 0) {
          return NextResponse.json({ error: "El paquete no tiene cursos." }, { status: 409 });
        }
        if (price <= 0) {
          return NextResponse.json({ error: "El paquete debe tener precio > 0." }, { status: 409 });
        }
      }
      data.published = Boolean(b.published);
    }

    const bundle = await prisma.bundle.update({ where: { id }, data });
    return NextResponse.json({ bundle });
  } catch (e) {
    console.error("[admin:bundles:PATCH]", e);
    return NextResponse.json({ error: "Error al actualizar el paquete" }, { status: 500 });
  }
}

// DELETE ?id= -> eliminar paquete
export async function DELETE(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.bundle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
