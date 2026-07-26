import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/courses/[id] -> curso completo (para edición)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const course = await prisma.course.findUnique({
    where: { id: Number(params.id) },
  });
  if (!course) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(
    { course },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
