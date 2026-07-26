import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncCoursesFromEvolmind } from "@/lib/courses-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * POST /api/admin/courses/rename-subject
 * Body: { evolmindCourseId: number, subjectId: number, newName: string }
 *
 * Renombra una asignatura en evolCampus (scraping: abrir modal, cambiar el
 * nombre, Aceptar) y sincroniza. Best-effort (reintenta internamente).
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let evolmindCourseId = 0;
  let subjectId = 0;
  let newName = "";
  try {
    const body = await req.json();
    evolmindCourseId = Number(body?.evolmindCourseId);
    subjectId = Number(body?.subjectId);
    newName = String(body?.newName || "").trim();
  } catch {
    // body inválido
  }
  if (!evolmindCourseId || !subjectId || !newName) {
    return NextResponse.json(
      { error: "evolmindCourseId, subjectId y newName son requeridos" },
      { status: 400 }
    );
  }

  try {
    const { renameCourseSubjectViaScraper, scraperConfigFromEnv, isScraperConfigured } =
      await import("@/lib/evolcampus-scraper");

    if (!isScraperConfigured(scraperConfigFromEnv())) {
      return NextResponse.json(
        { error: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)." },
        { status: 409 }
      );
    }

    const result = await renameCourseSubjectViaScraper(evolmindCourseId, subjectId, newName);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    try {
      await syncCoursesFromEvolmind();
    } catch (e) {
      console.error("[rename-subject] sync:", e);
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error("[admin:courses:rename-subject] Error:", error);
    const msg = error instanceof Error ? error.message : "Error al renombrar";
    const hint = /Executable doesn't exist|browserType.launch/i.test(msg)
      ? " (¿falta 'npx playwright install chromium'?)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
