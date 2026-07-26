import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * POST /api/admin/courses/archive-subject
 * Body: { evolmindCourseId: number, subjectId: number }
 *
 * Archiva una asignatura en evolCampus mediante RPA (Playwright, autologin admin).
 * Best-effort: el panel de evolCampus es un SPA inestable, así que puede fallar
 * y hay que reintentar (la función ya reintenta 3 veces internamente). Es SEGURO:
 * solo confirma en el diálogo de "asignatura", nunca archiva el curso.
 * Herramienta local por ahora.
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
    const { archiveCourseSubjectViaScraper, scraperConfigFromEnv, isScraperConfigured } =
      await import("@/lib/evolcampus-scraper");

    if (!isScraperConfigured(scraperConfigFromEnv())) {
      return NextResponse.json(
        { error: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)." },
        { status: 409 }
      );
    }

    const result = await archiveCourseSubjectViaScraper(evolmindCourseId, subjectId);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error("[admin:courses:archive-subject] Error:", error);
    const msg = error instanceof Error ? error.message : "Error al archivar";
    const hint = /Executable doesn't exist|browserType.launch/i.test(msg)
      ? " (¿falta 'npx playwright install chromium'?)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
