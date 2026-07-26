import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncCoursesFromEvolmind } from "@/lib/courses-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/admin/courses/subjects
 * Body: { evolmindCourseId: number, subjects: string[] }
 *
 * Añade asignaturas (temario) a un curso EXISTENTE de evolCampus mediante RPA
 * (Playwright, autologin admin) y luego sincroniza el catálogo local para
 * reflejar el temario actualizado. Herramienta local por ahora.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let evolmindCourseId = 0;
  let subjects: string[] = [];
  try {
    const body = await req.json();
    evolmindCourseId = Number(body?.evolmindCourseId);
    if (Array.isArray(body?.subjects)) {
      subjects = body.subjects.map((s: unknown) => String(s).trim()).filter(Boolean);
    }
  } catch {
    // body inválido
  }

  if (!evolmindCourseId) {
    return NextResponse.json(
      { error: "evolmindCourseId es requerido" },
      { status: 400 }
    );
  }
  if (subjects.length === 0) {
    return NextResponse.json(
      { error: "Indica al menos una asignatura" },
      { status: 400 }
    );
  }

  try {
    const { addCourseSubjectsViaScraper, scraperConfigFromEnv, isScraperConfigured } =
      await import("@/lib/evolcampus-scraper");

    if (!isScraperConfigured(scraperConfigFromEnv())) {
      return NextResponse.json(
        {
          error:
            "Scraper no configurado. Define EVOLCAMPUS_ADMIN_EMAIL (y EVOLMIND_*) en el entorno.",
        },
        { status: 409 }
      );
    }

    const result = await addCourseSubjectsViaScraper(evolmindCourseId, subjects);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    // Sincroniza para reflejar el nuevo temario en el catálogo local.
    try {
      await syncCoursesFromEvolmind();
    } catch (e) {
      console.error("[courses:subjects] sync:", e);
    }

    return NextResponse.json({
      ok: true,
      subjectsCreated: result.subjectsCreated ?? 0,
      message: result.message,
    });
  } catch (error) {
    console.error("[admin:courses:subjects] Error:", error);
    const msg = error instanceof Error ? error.message : "Error al añadir asignaturas";
    const hint = /Executable doesn't exist|browserType.launch/i.test(msg)
      ? " (¿falta 'npx playwright install chromium'?)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
