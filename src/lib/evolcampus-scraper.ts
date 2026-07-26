/**
 * Scraper (RPA) del panel de administración de evolCampus.
 *
 * evolCampus NO expone API para crear cursos (solo lectura vía getCourses /
 * getCoursesGroups). Este módulo automatiza el panel web con Playwright para
 * cubrir ese hueco: login + creación de curso, devolviendo el id creado.
 *
 * Diseño:
 *  - Los SELECTORES reales viven en scripts/evol-selectors.json y se descubren
 *    con `npm run evol:explore`. No se adivinan aquí.
 *  - Si un selector configurado está vacío, se aplica una heurística de
 *    respaldo (útil para el POC), pero lo robusto es fijar los selectores.
 *  - Pensado para ejecución LOCAL / job manual. Chromium headless en algunos
 *    PaaS (p.ej. DO App Platform) es problemático; mantener como herramienta
 *    local por ahora.
 *
 * Autorización: solo la propia cuenta del cliente. Revisar ToS de evolCampus.
 */

import { chromium, Browser, Page } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  verifyEmail,
  getAutologinUrl,
  getEvolmindCourses,
} from "./evolmind";

export interface EvolSelectors {
  login: { url?: string; userInput?: string; passInput?: string; submit?: string };
  courseCreate: {
    url?: string;
    nameInput?: string;
    descriptionInput?: string;
    submit?: string;
    createdIdFrom?: "url" | string; // "url" = extraer id de la URL resultante
  };
}

/**
 * Modo de inicio de sesión en el panel:
 *  - "autologin": usa la API de evolCampus (verifyEmail + getUrlAutologin) para
 *    obtener una URL con sesión ya iniciada del usuario admin (adminEmail). No
 *    requiere guardar la contraseña del panel. RECOMENDADO.
 *  - "credentials": rellena usuario/contraseña en el formulario de login.
 */
export type LoginMode = "autologin" | "credentials";

export interface ScraperConfig {
  adminUrl: string;
  /** email del usuario ADMIN en evolCampus (para login por autologin) */
  adminEmail: string;
  /** credenciales del panel (solo modo "credentials") */
  user: string;
  pass: string;
  loginMode: LoginMode;
  headless?: boolean;
  selectors?: Partial<EvolSelectors>;
}

export interface CreateCourseInput {
  name: string;
  description?: string;
  /** Asignaturas (temario) a crear dentro del curso, en orden. */
  subjects?: string[];
}

export interface CreateCourseResult {
  success: boolean;
  message: string;
  courseId?: number;
  resultingUrl?: string;
  /** nº de asignaturas creadas correctamente (si se pidieron) */
  subjectsCreated?: number;
}

const DEFAULT_TIMEOUT = 30000;

function loadSelectorsFromFile(): Partial<EvolSelectors> {
  const file = join(process.cwd(), "scripts", "evol-selectors.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export function scraperConfigFromEnv(
  overrides: Partial<ScraperConfig> = {}
): ScraperConfig {
  const adminEmail =
    overrides.adminEmail ?? process.env.EVOLCAMPUS_ADMIN_EMAIL ?? "";
  const user = overrides.user ?? process.env.EVOLCAMPUS_ADMIN_USER ?? "";
  const pass = overrides.pass ?? process.env.EVOLCAMPUS_ADMIN_PASS ?? "";
  // Por defecto, si hay email de admin usamos autologin (no requiere password).
  const loginMode: LoginMode =
    overrides.loginMode ??
    (process.env.EVOLCAMPUS_LOGIN_MODE as LoginMode) ??
    (adminEmail ? "autologin" : "credentials");

  return {
    adminUrl: process.env.EVOLCAMPUS_ADMIN_URL || "",
    adminEmail,
    user,
    pass,
    loginMode,
    headless: overrides.headless ?? true,
    selectors: overrides.selectors ?? loadSelectorsFromFile(),
    ...overrides,
  };
}

export function isScraperConfigured(cfg: ScraperConfig): boolean {
  if (cfg.loginMode === "autologin") {
    // autologin sólo necesita el email admin (la sesión sale de la API evolCampus)
    return Boolean(cfg.adminEmail);
  }
  return Boolean(cfg.adminUrl && cfg.user && cfg.pass);
}

/**
 * Obtiene una URL de autologin al panel de evolCampus para el usuario admin.
 * Resuelve el email -> userId (verifyEmail) y luego getUrlAutologin.
 */
export async function getAdminAutologinUrl(
  cfg: ScraperConfig
): Promise<string> {
  const verified = await verifyEmail(cfg.adminEmail);
  if (!verified.exists || !verified.userId) {
    throw new Error(
      `El email admin ${cfg.adminEmail} no existe en evolCampus (verifyEmail)`
    );
  }
  const url = await getAutologinUrl(verified.userId);
  if (!url) {
    throw new Error("No se pudo generar la URL de autologin del admin");
  }
  return url;
}

async function login(page: Page, cfg: ScraperConfig): Promise<void> {
  // --- Modo autologin: navegamos a la URL con sesión ya iniciada ---
  if (cfg.loginMode === "autologin") {
    const autoUrl = await getAdminAutologinUrl(cfg);
    // domcontentloaded (no networkidle): el panel usa long-polling/websockets.
    await page.goto(autoUrl, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT,
    });
    await page.waitForTimeout(2000);
    // Si el panel de gestión vive en otra URL y no aterrizamos ya en él,
    // navegamos allí reutilizando la sesión/cookies del autologin.
    if (cfg.adminUrl && !page.url().includes("gestion")) {
      try {
        await page.goto(cfg.adminUrl, {
          waitUntil: "domcontentloaded",
          timeout: DEFAULT_TIMEOUT,
        });
        await page.waitForTimeout(1500);
      } catch {
        // si falla, nos quedamos donde dejó el autologin
      }
    }
    return;
  }

  // --- Modo credenciales: rellenar el formulario de login ---
  const sel = cfg.selectors?.login || {};
  const startUrl = sel.url || cfg.adminUrl;
  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
  await page.waitForTimeout(1000);

  const userInput = sel.userInput
    ? page.locator(sel.userInput).first()
    : page
        .locator(
          'input[type="email"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i], input[type="text"]'
        )
        .first();
  const passInput = sel.passInput
    ? page.locator(sel.passInput).first()
    : page.locator('input[type="password"]').first();

  await userInput.fill(cfg.user, { timeout: DEFAULT_TIMEOUT });
  await passInput.fill(cfg.pass, { timeout: DEFAULT_TIMEOUT });

  const submit = sel.submit
    ? page.locator(sel.submit).first()
    : page
        .locator(
          'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Acceder"), button:has-text("Iniciar")'
        )
        .first();

  if (await submit.count()) {
    await Promise.all([
      page.waitForLoadState("domcontentloaded", { timeout: DEFAULT_TIMEOUT }).catch(() => {}),
      submit.click(),
    ]);
  } else {
    await passInput.press("Enter");
    await page.waitForLoadState("domcontentloaded", { timeout: DEFAULT_TIMEOUT }).catch(() => {});
  }
  await page.waitForTimeout(1500);

  // Verificación básica: si seguimos viendo un input password, el login falló.
  if (await page.locator('input[type="password"]').count()) {
    throw new Error(
      "Login fallido: sigue apareciendo el formulario de acceso. Revisa credenciales/selectores."
    );
  }
}

function extractCourseIdFromUrl(url: string): number | undefined {
  // Patrones habituales: ?idcurso=123, /curso/123, /course/123, id=123
  const patterns = [
    /[?&](?:idcurso|idcourse|courseid|id)=(\d+)/i,
    /\/curso[s]?\/(\d+)/i,
    /\/course[s]?\/(\d+)/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/**
 * Añade asignaturas (temario) a un curso dentro de la página de configuración
 * del curso en el panel (iframe SPA /em/courses/courses/{id}/config).
 * Reutiliza una `page` ya autenticada. Devuelve cuántas creó.
 */
async function addSubjectsInSession(
  page: Page,
  cfg: ScraperConfig,
  courseId: number,
  subjects: string[]
): Promise<number> {
  const getSpaFrame = () =>
    page.frames().find((f) => /\/em\/courses/.test(f.url()));

  // Aseguramos estar en el wrapper con el iframe cargado.
  if (!getSpaFrame()) {
    await page.goto(new URL("/gestion/cursos/", cfg.adminUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT,
    });
    for (let i = 0; i < 20 && !getSpaFrame(); i++) await page.waitForTimeout(500);
  }
  let sf = getSpaFrame();
  if (!sf) throw new Error("No se encontró el frame SPA para añadir asignaturas");

  // Navegar el iframe a la config del curso.
  const configPath = `/em/courses/courses/${courseId}/config`;
  await sf.evaluate((url) => {
    window.location.href = url as string;
  }, configPath);
  await page.waitForTimeout(4000);

  let created = 0;
  for (const name of subjects) {
    const subject = name.trim();
    if (!subject) continue;
    try {
      sf = getSpaFrame()!;
      await sf
        .locator('button:has-text("Añadir asignatura")')
        .first()
        .click({ timeout: DEFAULT_TIMEOUT });
      await page.waitForTimeout(1200);
      sf = getSpaFrame()!;
      await sf
        .getByLabel("Nombre de la asignatura")
        .last()
        .fill(subject, { timeout: DEFAULT_TIMEOUT });
      // Botón "guardar" del formulario de asignatura (no "guardar cambios").
      sf = getSpaFrame()!;
      await sf
        .locator('button:has-text("guardar")')
        .filter({ hasNotText: "cambios" })
        .last()
        .click({ timeout: DEFAULT_TIMEOUT });
      await page.waitForTimeout(2500);
      created++;
    } catch (e) {
      console.error(`[scraper] fallo al crear asignatura "${subject}":`, e);
      // seguimos con las siguientes
    }
  }
  return created;
}

export interface AddSubjectsResult {
  success: boolean;
  message: string;
  subjectsCreated?: number;
}

/**
 * Añade asignaturas (temario) a un curso EXISTENTE de evolCampus, abriendo su
 * propia sesión de navegador (autologin admin). Devuelve cuántas creó.
 */
export async function addCourseSubjectsViaScraper(
  courseId: number,
  subjects: string[],
  configOverrides: Partial<ScraperConfig> = {}
): Promise<AddSubjectsResult> {
  const cfg = scraperConfigFromEnv(configOverrides);
  if (!isScraperConfigured(cfg)) {
    return {
      success: false,
      message:
        "Scraper no configurado: define EVOLCAMPUS_ADMIN_EMAIL (autologin) en .env.local",
    };
  }
  const clean = subjects.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) {
    return { success: false, message: "No se indicaron asignaturas" };
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || function (f) { return f; };"
    );
    const page = await context.newPage();
    await login(page, cfg);
    const created = await addSubjectsInSession(page, cfg, courseId, clean);
    return {
      success: created > 0,
      subjectsCreated: created,
      message:
        created === clean.length
          ? `${created} asignatura(s) añadida(s)`
          : `${created}/${clean.length} asignatura(s) añadida(s)`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Error en el scraper",
    };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Archiva una asignatura de un curso en evolCampus (el equivalente a "borrar":
 * la quita del temario y deja de estar disponible para alumnos activos).
 *
 * Flujo real del panel (SPA): abrir /config, clicar la asignatura (abre el modal
 * "Modificar asignatura"), pulsar "Archivar", activar el switch "Comprendo las
 * consecuencias" y confirmar.
 *
 * SEGURIDAD: solo confirma dentro de un diálogo cuyo texto menciona
 * "asignatura" (el de archivar CURSO dice "curso"), para no archivar el curso
 * por error.
 */
export async function archiveCourseSubjectViaScraper(
  courseId: number,
  subjectId: number,
  configOverrides: Partial<ScraperConfig> = {}
): Promise<{ success: boolean; message: string }> {
  const cfg = scraperConfigFromEnv(configOverrides);
  if (!isScraperConfigured(cfg)) {
    return { success: false, message: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)" };
  }
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || function (f) { return f; };"
    );
    const page = await context.newPage();
    await login(page, cfg);

    const spa = () => page.frames().find((f) => /\/em\/courses/.test(f.url()));
    const poll = async (fn: string, arg: any, ms = 12000): Promise<any> => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const f = spa();
        if (f) { try { const r = await f.evaluate(new Function("arg", fn) as any, arg); if (r) return r; } catch {} }
        await page.waitForTimeout(400);
      }
      return null;
    };

    // El panel es un SPA anidado inestable; reintentamos el flujo completo.
    let lastErr = "no ejecutado";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Navegar (recargar) la lista de asignaturas del curso.
        if (!spa()) {
          await page.goto(new URL("/gestion/cursos/", cfg.adminUrl).toString(), {
            waitUntil: "domcontentloaded",
            timeout: DEFAULT_TIMEOUT,
          });
          for (let i = 0; i < 20 && !spa(); i++) await page.waitForTimeout(500);
        }
        if (!spa()) throw new Error("No se encontró el frame SPA de cursos");
        await spa()!.evaluate((u) => { (window as any).location.href = u as string; }, `/em/courses/courses/${courseId}/config`);
        await page.waitForTimeout(4500);

        // 1) Abrir modal "Modificar asignatura" (clic REAL en el enlace).
        let opened = false;
        const t0 = Date.now();
        while (Date.now() - t0 < 12000 && !opened) {
          const f = spa();
          if (f) {
            const link = f.locator(`a[href*="update-subject/${subjectId}"]`).first();
            if (await link.count().catch(() => 0)) {
              await link.click({ timeout: 4000 }).then(() => { opened = true; }).catch(() => {});
            }
          }
          if (!opened) await page.waitForTimeout(500);
        }
        if (!opened) throw new Error("No se pudo abrir la asignatura");
        await page.waitForTimeout(1800);

        // 2) Clic en "Archivar" DENTRO del modal "Modificar asignatura"
        //    (evita pulsar el "Archivar" del curso). Fallback: primer visible.
        const s2 = await poll(`
          const cands=[...document.querySelectorAll('div,section,aside')].filter(d=>d.offsetWidth>0 && /Modificar asignatura/i.test(d.textContent||'') && [...d.querySelectorAll('button')].some(b=>/^\\s*archivar\\s*$/i.test((b.textContent||'').trim())&&!b.disabled&&b.offsetWidth>0));
          let scope=null;
          if(cands.length){ cands.sort((a,b)=>a.textContent.length-b.textContent.length); scope=cands[0]; }
          const root = scope || document;
          const b=[...root.querySelectorAll('button')].find(x=>/^\\s*archivar\\s*$/i.test((x.textContent||'').trim())&&x.offsetWidth>0&&!x.disabled);
          if(!b)return null; b.click(); return 'ok';
        `, null);
        if (!s2) throw new Error("No se encontró el botón Archivar");
        await page.waitForTimeout(1500);

        // 3) Diálogo de ASIGNATURA (seguridad): activar el switch.
        const s3 = await poll(`
          const ds=[...document.querySelectorAll('[class*=base-modal]')].filter(d=>d.offsetWidth>0);
          const dlg=ds.find(d=>{const t=(d.textContent||'').toLowerCase(); return t.includes('comprendo') && t.includes('asignatura') && !t.includes('archivar este curso');});
          if(!dlg) return null;
          const inp=dlg.querySelector('input.base-switch__input, input[type=checkbox]');
          const lab=dlg.querySelector('.base-switch__label'); const sw=dlg.querySelector('.base-switch');
          if(inp && !inp.checked){ if(lab) lab.click(); else if(sw) sw.click(); else inp.click(); }
          return 'ok';
        `, null);
        if (!s3) throw new Error("No apareció el diálogo de archivar asignatura");
        await page.waitForTimeout(1000);

        // 4) Confirmar dentro del mismo diálogo seguro.
        const s4 = await poll(`
          const ds=[...document.querySelectorAll('[class*=base-modal]')].filter(d=>d.offsetWidth>0);
          const dlg=ds.find(d=>{const t=(d.textContent||'').toLowerCase(); return t.includes('comprendo') && t.includes('asignatura') && !t.includes('archivar este curso');});
          if(!dlg) return null;
          const b=[...dlg.querySelectorAll('button')].find(x=>{const t=(x.textContent||'').trim().toLowerCase(); return t && t!=='cancelar' && !x.disabled && x.offsetWidth>0;});
          if(!b) return null; b.click(); return 'ok';
        `, null);
        if (!s4) throw new Error("No se pudo confirmar (switch no activado)");
        await page.waitForTimeout(3500);

        return { success: true, message: "Asignatura archivada en evolCampus" };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "error";
        // reintentar: forzar recarga del frame en el siguiente intento
        await page.waitForTimeout(1000);
      }
    }
    return { success: false, message: `No se pudo archivar tras 3 intentos: ${lastErr}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error al archivar" };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * BORRA definitivamente una asignatura en evolCampus. En evolCampus solo se
 * puede eliminar una asignatura ARCHIVADA, así que el flujo es:
 *   1) Archivar (si aún está activa).
 *   2) Ir a "Archivadas", abrir la asignatura -> "Eliminar" (ya habilitado).
 *   3) Activar el switch "Comprendo las consecuencias" y confirmar (Aceptar).
 * Solo el borrado (no el archivado) hace que desaparezca de getCourses y, por
 * tanto, de la tienda tras sincronizar.
 *
 * SEGURIDAD: los diálogos de confirmación se acotan a los que mencionan
 * "asignatura" (nunca "curso").
 */
export async function deleteCourseSubjectViaScraper(
  courseId: number,
  subjectId: number,
  configOverrides: Partial<ScraperConfig> = {}
): Promise<{ success: boolean; message: string }> {
  const cfg = scraperConfigFromEnv(configOverrides);
  if (!isScraperConfigured(cfg)) {
    return { success: false, message: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)" };
  }
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || function (f) { return f; };"
    );
    const page = await context.newPage();
    await login(page, cfg);

    const spa = () => page.frames().find((f) => /\/em\/courses/.test(f.url()));
    const poll = async (fn: string, arg: any, ms = 12000): Promise<any> => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        const f = spa();
        if (f) { try { const r = await f.evaluate(new Function("arg", fn) as any, arg); if (r) return r; } catch {} }
        await page.waitForTimeout(400);
      }
      return null;
    };
    const gotoConfig = async () => {
      if (!spa()) {
        await page.goto(new URL("/gestion/cursos/", cfg.adminUrl).toString(), { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
        for (let i = 0; i < 20 && !spa(); i++) await page.waitForTimeout(500);
      }
      if (!spa()) throw new Error("No se encontró el frame SPA de cursos");
      await spa()!.evaluate((u) => { (window as any).location.href = u as string; }, `/em/courses/courses/${courseId}/config`);
      await page.waitForTimeout(4500);
    };
    // Abre la asignatura por clic real en su enlace (en la pestaña actual).
    const openSubject = async (): Promise<boolean> => {
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        const f = spa();
        if (f) {
          const link = f.locator(`a[href*="update-subject/${subjectId}"]`).first();
          if (await link.count().catch(() => 0)) {
            const ok = await link.click({ timeout: 4000 }).then(() => true).catch(() => false);
            if (ok) { await page.waitForTimeout(1500); return true; }
          }
        }
        await page.waitForTimeout(500);
      }
      return false;
    };
    // Activa el switch "Comprendo" y confirma (Aceptar) en un diálogo de asignatura.
    const confirmDialog = async (kind: "archivar" | "eliminar"): Promise<boolean> => {
      const s3 = await poll(`
        const ds=[...document.querySelectorAll('[class*=base-modal]')].filter(d=>d.offsetWidth>0);
        const dlg=ds.find(d=>{const t=(d.textContent||'').toLowerCase(); return t.includes('comprendo') && t.includes('${kind} esta asignatura');});
        if(!dlg) return null;
        const inp=dlg.querySelector('input.base-switch__input, input[type=checkbox]');
        const lab=dlg.querySelector('.base-switch__label'); const sw=dlg.querySelector('.base-switch');
        if(inp && !inp.checked){ if(lab) lab.click(); else if(sw) sw.click(); else inp.click(); }
        return 'ok';
      `, null);
      if (!s3) return false;
      await page.waitForTimeout(900);
      const s4 = await poll(`
        const ds=[...document.querySelectorAll('[class*=base-modal]')].filter(d=>d.offsetWidth>0);
        const dlg=ds.find(d=>{const t=(d.textContent||'').toLowerCase(); return t.includes('comprendo') && t.includes('${kind} esta asignatura');});
        if(!dlg) return null;
        const b=[...dlg.querySelectorAll('button')].find(x=>{const t=(x.textContent||'').trim().toLowerCase(); return t && t!=='cancelar' && !x.disabled && x.offsetWidth>0;});
        if(!b) return null; b.click(); return 'ok';
      `, null);
      if (!s4) return false;
      await page.waitForTimeout(3000);
      return true;
    };
    const clickTab = async (label: string) => {
      await poll(`const t=[...document.querySelectorAll('button,a,[role=tab]')].find(n=>new RegExp('^\\\\s*${label}','i').test((n.textContent||'').trim())); if(!t) return null; t.click(); return 'ok';`, null, 6000);
      await page.waitForTimeout(1500);
    };

    let lastErr = "no ejecutado";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // ---- Fase 1: asegurar que esté ARCHIVADA ----
        await gotoConfig();
        if (await openSubject()) {
          // ¿Eliminar habilitado? Si sí, ya está archivada; si no, archivar.
          const elimEnabled = await poll(`const b=[...document.querySelectorAll('button')].find(x=>/^\\s*eliminar\\s*$/i.test((x.textContent||'').trim())&&x.offsetWidth>0&&!x.disabled); return b?'yes':'no';`, null, 4000);
          if (elimEnabled === "no") {
            // Archivar: clic en Archivar del modal de asignatura.
            const a2 = await poll(`
              const cands=[...document.querySelectorAll('div,section,aside')].filter(d=>d.offsetWidth>0 && /Modificar asignatura/i.test(d.textContent||'') && [...d.querySelectorAll('button')].some(b=>/^\\s*archivar\\s*$/i.test((b.textContent||'').trim())&&!b.disabled&&b.offsetWidth>0));
              let scope=null; if(cands.length){cands.sort((a,b)=>a.textContent.length-b.textContent.length); scope=cands[0];}
              const root=scope||document; const b=[...root.querySelectorAll('button')].find(x=>/^\\s*archivar\\s*$/i.test((x.textContent||'').trim())&&x.offsetWidth>0&&!x.disabled);
              if(!b)return null; b.click(); return 'ok';
            `, null);
            if (a2) {
              await page.waitForTimeout(1500);
              await confirmDialog("archivar");
            }
          }
        }

        // ---- Fase 2: borrar desde "Archivadas" ----
        await gotoConfig();
        await clickTab("Archivadas");
        if (!(await openSubject())) throw new Error("No se pudo abrir la asignatura archivada");
        const del = await poll(`const b=[...document.querySelectorAll('button')].find(x=>/^\\s*eliminar\\s*$/i.test((x.textContent||'').trim())&&x.offsetWidth>0&&!x.disabled); if(!b)return null; b.click(); return 'ok';`, null);
        if (!del) throw new Error("El botón Eliminar no está habilitado (¿no se archivó?)");
        await page.waitForTimeout(1500);
        if (!(await confirmDialog("eliminar"))) throw new Error("No se pudo confirmar el borrado");

        return { success: true, message: "Asignatura eliminada de evolCampus" };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "error";
        await page.waitForTimeout(1000);
      }
    }
    return { success: false, message: `No se pudo borrar tras 3 intentos: ${lastErr}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error al borrar" };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Renombra una asignatura en evolCampus (no hay API; por scraping).
 * Flujo: abrir /config, clic REAL en la asignatura (modal "Modificar
 * asignatura"), localizar el input cuyo valor == nombre actual, limpiarlo,
 * teclear el nuevo nombre (tecleo real para que Vue lo registre) y "Aceptar".
 */
export async function renameCourseSubjectViaScraper(
  courseId: number,
  subjectId: number,
  newName: string,
  configOverrides: Partial<ScraperConfig> = {}
): Promise<{ success: boolean; message: string }> {
  const cfg = scraperConfigFromEnv(configOverrides);
  if (!isScraperConfigured(cfg)) {
    return { success: false, message: "Scraper no configurado (EVOLCAMPUS_ADMIN_EMAIL)" };
  }
  const name = newName.trim();
  if (!name) return { success: false, message: "El nuevo nombre está vacío" };

  // Nombre actual (para localizar el input correcto en el modal).
  let currentName = "";
  try {
    const courses = await getEvolmindCourses();
    const c = courses.find((x) => x.id === courseId);
    const s = (c?.subjects || []).find((x) => Number(x.subjectid) === subjectId);
    currentName = (s?.subject || "").trim();
  } catch {
    // seguimos; si no lo tenemos, fallará al localizar el input
  }
  if (!currentName) {
    return { success: false, message: "No se pudo determinar el nombre actual de la asignatura" };
  }
  if (currentName === name) {
    return { success: true, message: "El nombre ya es el indicado" };
  }

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || function (f) { return f; };"
    );
    const page = await context.newPage();
    await login(page, cfg);
    const spa = () => page.frames().find((f) => /\/em\/courses/.test(f.url()));

    let lastErr = "no ejecutado";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!spa()) {
          await page.goto(new URL("/gestion/cursos/", cfg.adminUrl).toString(), { waitUntil: "domcontentloaded", timeout: DEFAULT_TIMEOUT });
          for (let i = 0; i < 20 && !spa(); i++) await page.waitForTimeout(500);
        }
        if (!spa()) throw new Error("No se encontró el frame SPA");
        await spa()!.evaluate((u) => { (window as any).location.href = u as string; }, `/em/courses/courses/${courseId}/config`);
        await page.waitForTimeout(4500);

        // Abrir modal con CLIC REAL en el enlace.
        let opened = false;
        const t0 = Date.now();
        while (Date.now() - t0 < 12000 && !opened) {
          const f = spa();
          if (f) {
            const link = f.locator(`a[href*="update-subject/${subjectId}"]`).first();
            if (await link.count().catch(() => 0)) {
              await link.click({ timeout: 4000 }).then(() => { opened = true; }).catch(() => {});
            }
          }
          if (!opened) await page.waitForTimeout(500);
        }
        if (!opened) throw new Error("No se pudo abrir la asignatura");
        await page.waitForTimeout(2000);

        // Marcar el input del modal cuyo valor === nombre actual.
        const sf = spa();
        if (!sf) throw new Error("frame perdido");
        const marked = await sf.evaluate((cur) => {
          document.querySelectorAll('[data-rename-target]').forEach((e) => e.removeAttribute('data-rename-target'));
          const inp = [...document.querySelectorAll("input.base-text-input")].find(
            (i) => (i as HTMLInputElement).value.trim() === cur && (i as HTMLElement).offsetWidth > 0
          ) as HTMLInputElement | undefined;
          if (!inp) return false;
          inp.setAttribute("data-rename-target", "1");
          return true;
        }, currentName);
        if (!marked) throw new Error("No se encontró el campo con el nombre actual");

        const inp = sf.locator('input[data-rename-target="1"]');
        await inp.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
        await inp.focus();
        await inp.fill(""); // limpiar de forma fiable
        await page.waitForTimeout(200);
        await inp.pressSequentially(name, { delay: 35 }); // tecleo real -> Vue registra
        await page.waitForTimeout(700);
        if ((await inp.inputValue()).trim() !== name) {
          throw new Error("El campo no quedó con el nuevo nombre");
        }

        // "Aceptar" (guardar) con clic real (force por el overlay).
        const aceptar = sf.locator('button:has-text("Aceptar")').last();
        await aceptar.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
        await aceptar.click({ force: true, timeout: DEFAULT_TIMEOUT });
        await page.waitForTimeout(3500);

        return { success: true, message: `Asignatura renombrada a "${name}"` };
      } catch (e) {
        lastErr = e instanceof Error ? e.message : "error";
        await page.waitForTimeout(1000);
      }
    }
    return { success: false, message: `No se pudo renombrar tras 3 intentos: ${lastErr}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error al renombrar" };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Crea un curso en el panel de evolCampus vía navegador automatizado.
 * Devuelve el id del curso creado si logra extraerlo de la URL resultante.
 * Si se pasan `input.subjects`, además crea esas asignaturas en el curso.
 */
export async function createCourseViaScraper(
  input: CreateCourseInput,
  configOverrides: Partial<ScraperConfig> = {}
): Promise<CreateCourseResult> {
  const cfg = scraperConfigFromEnv(configOverrides);
  if (!isScraperConfigured(cfg)) {
    return {
      success: false,
      message:
        "Scraper no configurado: define EVOLCAMPUS_ADMIN_EMAIL (autologin) en .env.local",
    };
  }

  const coursesUrl = new URL("/gestion/cursos/", cfg.adminUrl).toString();
  /** Devuelve el frame de la SPA de cursos (/em/courses...) re-adquirido. */
  const getSpaFrame = (page: Page) =>
    page.frames().find((f) => /\/em\/courses/.test(f.url()));

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    // Shim por si el bundler inyecta __name en funciones de page/frame.evaluate.
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || function (f) { return f; };"
    );
    const page = await context.newPage();

    // 1) Login (autologin como admin) y navegar al módulo de cursos.
    await login(page, cfg);
    await page.goto(coursesUrl, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT,
    });

    // 2) Esperar a que cargue el iframe de la SPA de cursos.
    await page
      .waitForSelector("#iframe-new-front", { timeout: DEFAULT_TIMEOUT })
      .catch(() => {});
    // Esperar a que el frame SPA aparezca y renderice el botón NUEVO.
    for (let i = 0; i < 20 && !getSpaFrame(page); i++) {
      await page.waitForTimeout(500);
    }
    let sf = getSpaFrame(page);
    if (!sf) throw new Error("No se encontró el frame SPA de cursos (/em/courses)");
    await sf.locator(".new-button").first().waitFor({ timeout: DEFAULT_TIMEOUT });

    // 3) Abrir el menú NUEVO y elegir "Crear curso".
    sf = getSpaFrame(page)!;
    await sf.locator(".new-button").first().click({ timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(1200);
    sf = getSpaFrame(page)!;
    const crearCursoMenu = sf
      .locator(
        '.base-dropdown-list-item__button:has-text("Crear curso"), button:has-text("Crear curso"):not(.primary)'
      )
      .first();
    if (await crearCursoMenu.count()) {
      await crearCursoMenu.click({ timeout: DEFAULT_TIMEOUT });
      await page.waitForTimeout(1500);
    }

    // 4) Rellenar el formulario del modal.
    sf = getSpaFrame(page)!;
    await sf
      .getByLabel("Nombre del curso")
      .first()
      .fill(input.name, { timeout: DEFAULT_TIMEOUT });

    // 5) Enviar (botón primario "Crear curso" del modal).
    sf = getSpaFrame(page)!;
    const submitBtn = sf
      .locator('.base-button.primary:has-text("Crear curso")')
      .last();
    await submitBtn.click({ timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(3500);

    const resultingUrl = getSpaFrame(page)?.url() || page.url();

    // 6) Resolver el id del curso creado vía API (más robusto que la URL).
    //    Buscamos por nombre exacto entre los cursos de evolCampus.
    let courseId = extractCourseIdFromUrl(resultingUrl);
    if (!courseId) {
      try {
        const courses = await getEvolmindCourses();
        const match = courses.find(
          (c) => c.name?.trim().toLowerCase() === input.name.trim().toLowerCase()
        );
        if (match) courseId = match.id;
      } catch {
        // si la API falla, devolvemos éxito sin id
      }
    }

    // 7) Crear asignaturas (temario) si se solicitaron y tenemos courseId.
    let subjectsCreated = 0;
    if (courseId && input.subjects && input.subjects.length > 0) {
      try {
        subjectsCreated = await addSubjectsInSession(
          page,
          cfg,
          courseId,
          input.subjects
        );
      } catch (e) {
        console.error("[scraper] error creando asignaturas:", e);
      }
    }

    const subjMsg =
      input.subjects && input.subjects.length
        ? ` con ${subjectsCreated}/${input.subjects.length} asignaturas`
        : "";

    return {
      success: true,
      message: courseId
        ? `Curso "${input.name}" creado en evolCampus (id ${courseId})${subjMsg}`
        : `Curso "${input.name}" enviado (verifica en el panel; no se resolvió el id)`,
      courseId,
      resultingUrl,
      subjectsCreated,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Error en el scraper",
    };
  } finally {
    if (browser) await browser.close();
  }
}
