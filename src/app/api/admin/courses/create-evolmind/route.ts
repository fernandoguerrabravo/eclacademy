import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncCoursesFromEvolmind } from "@/lib/courses-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// El scraper (Playwright) puede tardar; ampliamos el límite en plataformas que
// lo respeten. En local no aplica.
export const maxDuration = 120;

/**
 * POST /api/admin/courses/create-evolmind  { name: string }
 *
 * Crea un curso REAL en evolCampus mediante RPA (Playwright) usando la sesión
 * autologin del usuario admin (EVOLCAMPUS_ADMIN_EMAIL). Tras crearlo, sincroniza
 * el catálogo local para que aparezca en la plataforma.
 *
 * NOTA: requiere Chromium (Playwright) instalado en el servidor. Hoy es una
 * herramienta LOCAL; en producción (DO App Platform) el headless Chromium es
 * problemático y se habilitará más adelante.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let name = "";
  let subjects: string[] = [];
  try {
    const body = await req.json();
    name = String(body?.name || "").trim();
    if (Array.isArray(body?.subjects)) {
      subjects = body.subjects
        .map((s: unknown) => String(s).trim())
        .filter(Boolean);
    }
  } catch {
    // body inválido
  }

  if (!name) {
    return NextResponse.json(
      { error: "El nombre del curso es requerido" },
      { status: 400 }
    );
  }

  try {
    // Import dinámico: Playwright se carga solo cuando se usa (no en el arranque).
    const { createCourseViaScraper, scraperConfigFromEnv, isScraperConfigured } =
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

    const result = await createCourseViaScraper({ name, subjects });
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 502 }
      );
    }

    // Sincroniza el catálogo local para incorporar el curso recién creado.
    let sync: Awaited<ReturnType<typeof syncCoursesFromEvolmind>> | null = null;
    try {
      sync = await syncCoursesFromEvolmind();
    } catch (e) {
      console.error("[create-evolmind] sync tras crear:", e);
    }

    return NextResponse.json({
      ok: true,
      courseId: result.courseId ?? null,
      subjectsCreated: result.subjectsCreated ?? 0,
      message: result.message,
      sync,
    });
  } catch (error) {
    console.error("[admin:courses:create-evolmind] Error:", error);
    const msg =
      error instanceof Error ? error.message : "Error al crear el curso";
    // Pista útil si falta el navegador de Playwright.
    const hint = /Executable doesn't exist|browserType.launch/i.test(msg)
      ? " (¿falta 'npx playwright install chromium'?)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
