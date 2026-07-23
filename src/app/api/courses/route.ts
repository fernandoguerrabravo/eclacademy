import { NextResponse } from "next/server";
import { getStoreCourses } from "@/lib/courses-db";

export const dynamic = "force-dynamic";

// GET /api/courses -> cursos publicados de la tienda (origen: evolCampus)
export async function GET() {
  const courses = await getStoreCourses();
  return NextResponse.json({ courses });
}
