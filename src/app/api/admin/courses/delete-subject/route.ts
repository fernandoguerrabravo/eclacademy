import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncCoursesFromEvolmind } from "@/lib/courses-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 240;

/**
 * POST /api/admin/courses/delete-subject
 * Body: { evolmindCourseId: number, subjectId: number }
 *
 * BORRA definitivamente una asignatura en evolCampus (archiva -> Archivadas ->
 * Eliminar -> confirmar) y sincroniza el catálogo local. Solo el borrado quita
 * la asignatura de getCourses (y por tanto de la tienda). Best-effort: el panel
 * de evolCampus es inestable, así que reintenta internamente. Herramienta local.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let evolmindCourseId = 0;
  let subjectId = 0;
  try {
    const body = await req.json();
    evolmindCourseId = Number(body?.evolmindCourseId);
    subjectId = Number(body?.subjectId);
  } catch {
    // body inválido
  }
  if (!evolmindCourseId || !subjectId) {
    return NextResponse.json(
      { error: "evolmindCourseId y subjectId son requeridos" },
      { status: 400 }
    );
  }

  try {
    const { deleteCourseSubjectViaScraper, scraperConfigFromEnv, isScraperConfigured } =
      await import("@/lib/evolcampus-scraper");

    if (!isScraperConfigured(scraperConfigFromEnv())) {
      return NextResponse.json(
        { error: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)." },
        { status: 409 }
      );
    }

    const result = await deleteCourseSubjectViaScraper(evolmindCourseId, subjectId);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    // Sincroniza para reflejar el borrado en la tienda.
    try {
      await syncCoursesFromEvolmind();
    } catch (e) {
      console.error("[delete-subject] sync:", e);
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error("[admin:courses:delete-subject] Error:", error);
    const msg = error instanceof Error ? error.message : "Error al borrar";
    const hint = /Executable doesn't exist|browserType.launch/i.test(msg)
      ? " (¿falta 'npx playwright install chromium'?)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
