import { NextRequest, NextResponse } from "next/server";
import {
  getEvolmindCourses,
  getEvolmindCourseGroups,
  isEvolmindConfigured,
} from "@/lib/evolmind";

/**
 * GET /api/admin/evolmind-courses
 *   -> lista los cursos existentes en evolCampus (para enlazar).
 * GET /api/admin/evolmind-courses?courseId=123
 *   -> lista los grupos de ese curso (para obtener el groupid de matrícula).
 *
 * Protegido con ADMIN_TOKEN.
 */
export async function GET(req: NextRequest) {
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

  if (!isEvolmindConfigured()) {
    return NextResponse.json(
      { error: "evolCampus no configurado (EVOLMIND_CLIENT_ID / EVOLMIND_API_KEY)" },
      { status: 503 }
    );
  }

  try {
    const courseId = req.nextUrl.searchParams.get("courseId");
    if (courseId) {
      const groups = await getEvolmindCourseGroups(Number(courseId));
      return NextResponse.json({ groups });
    }
    const courses = await getEvolmindCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("[admin:evolmind-courses] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 502 }
    );
  }
}
