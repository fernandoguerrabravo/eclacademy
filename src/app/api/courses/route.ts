import { NextResponse } from "next/server";
import { courses } from "@/lib/courses";

// GET /api/courses  -> lista de cursos
export async function GET() {
  return NextResponse.json({ courses });
}
