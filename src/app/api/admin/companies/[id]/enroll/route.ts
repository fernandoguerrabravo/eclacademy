import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { bulkEnrollCompany } from "@/lib/companies";

/**
 * POST /api/admin/companies/[id]/enroll
 * Matricula en bloque a empleados de la empresa en un curso.
 * Body: { courseId, students: [{ email, name }] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { courseId, students } = await req.json();
  if (!courseId || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json(
      { error: "courseId y students son requeridos" },
      { status: 400 }
    );
  }

  const results = await bulkEnrollCompany({
    companyId: Number(params.id),
    courseId: Number(courseId),
    students,
  });

  const ok = results.filter((r) => r.success).length;
  return NextResponse.json({
    total: results.length,
    enrolled: ok,
    failed: results.length - ok,
    results,
  });
}
