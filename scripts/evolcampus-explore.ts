/**
 * Script EXPLORATORIO del panel de administración de evolCampus.
 *
 * Objetivo: iniciar sesión en el panel (EVOLCAMPUS_ADMIN_URL) y capturar la
 * estructura REAL del DOM de:
 *   1. La página de login (nombres/selectores de los inputs).
 *   2. La página / formulario de creación de curso.
 *
 * NO adivina selectores: los descubre y los vuelca a ./scripts/.evol-dump/
 * para que luego construyamos el scraper de creación con selectores reales.
 *
 * Uso (local, NO en producción):
 *   1. Completa en .env.local:
 *        EVOLCAMPUS_ADMIN_URL=https://gestionv1-c175427.evolcampus.com
 *        EVOLCAMPUS_ADMIN_USER=tu_usuario
 *        EVOLCAMPUS_ADMIN_PASS=tu_password
 *   2. npm run evol:explore            (headed, ves el navegador)
 *      npm run evol:explore -- --headless   (sin ventana)
 *
 * Autorización: solo se automatiza la propia cuenta del cliente. Revisa los
 * Términos de Servicio de evolCampus antes de usar en producción.
 */

import { chromium, Page } from "playwright";
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Carga .env.local primero, luego .env como fallback.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Importar tras cargar env (evolmind lee CLIENT_ID/API_KEY al ejecutarse).
import { getAdminAutologinUrl, scraperConfigFromEnv } from "../src/lib/evolcampus-scraper";

const ADMIN_URL = process.env.EVOLCAMPUS_ADMIN_URL || "";
const ADMIN_USER = process.env.EVOLCAMPUS_ADMIN_USER || "";
const ADMIN_PASS = process.env.EVOLCAMPUS_ADMIN_PASS || "";
const ADMIN_EMAIL = process.env.EVOLCAMPUS_ADMIN_EMAIL || "";
// Modo autologin si hay email admin y no se fuerza --credentials.
const USE_AUTOLOGIN =
  Boolean(ADMIN_EMAIL) && !process.argv.includes("--credentials");

const HEADLESS = process.argv.includes("--headless");
const OUT_DIR = join(process.cwd(), "scripts", ".evol-dump");

function requireEnv() {
  const missing: string[] = [];
  if (USE_AUTOLOGIN) {
    // autologin sólo necesita el email admin + credenciales API (EVOLMIND_*)
    if (!ADMIN_EMAIL) missing.push("EVOLCAMPUS_ADMIN_EMAIL");
  } else {
    if (!ADMIN_URL) missing.push("EVOLCAMPUS_ADMIN_URL");
    if (!ADMIN_USER) missing.push("EVOLCAMPUS_ADMIN_USER");
    if (!ADMIN_PASS) missing.push("EVOLCAMPUS_ADMIN_PASS");
  }
  if (missing.length) {
    console.error(
      `\n[explore] Faltan variables en .env.local: ${missing.join(", ")}\n`
    );
    process.exit(1);
  }
}

/** Vuelca todos los inputs/selects/botones/forms de la página actual a JSON. */
async function dumpFormFields(page: Page, label: string) {
  const data = await page.evaluate(() => {
    const describe = (el: Element) => {
      const e = el as HTMLInputElement;
      const attrs: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
      // etiqueta asociada (label for=id o label envolvente)
      let labelText = "";
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) labelText = (lbl.textContent || "").trim();
      }
      if (!labelText) {
        const parentLabel = el.closest("label");
        if (parentLabel) labelText = (parentLabel.textContent || "").trim();
      }
      return {
        tag: el.tagName.toLowerCase(),
        type: e.type || null,
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: (e.value || "").slice(0, 40),
        label: labelText.slice(0, 80),
        cssSuggestion: id
          ? `#${id}`
          : el.getAttribute("name")
            ? `${el.tagName.toLowerCase()}[name="${el.getAttribute("name")}"]`
            : null,
        attrs,
      };
    };

    const forms = Array.from(document.querySelectorAll("form")).map((f, i) => ({
      index: i,
      action: f.getAttribute("action"),
      method: f.getAttribute("method"),
      id: f.getAttribute("id"),
      name: f.getAttribute("name"),
    }));

    const fields = Array.from(
      document.querySelectorAll("input, select, textarea")
    ).map(describe);

    const buttons = Array.from(
      document.querySelectorAll("button, input[type=submit], a.btn, .btn")
    )
      .slice(0, 60)
      .map((b) => ({
        tag: b.tagName.toLowerCase(),
        type: (b as HTMLInputElement).type || null,
        text: (b.textContent || "").trim().slice(0, 60),
        id: b.getAttribute("id"),
        name: b.getAttribute("name"),
        href: b.getAttribute("href"),
        onclick: b.getAttribute("onclick"),
        classes: b.getAttribute("class"),
      }));

    // Todos los enlaces (menús): útil para localizar el módulo de cursos.
    const links = Array.from(document.querySelectorAll("a"))
      .map((a) => ({
        text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        href: a.getAttribute("href"),
        onclick: a.getAttribute("onclick"),
        id: a.getAttribute("id"),
        classes: a.getAttribute("class"),
      }))
      .filter((l) => l.text || l.href || l.onclick)
      .slice(0, 200);

    return { url: location.href, title: document.title, forms, fields, buttons, links };
  });

  const file = join(OUT_DIR, `${label}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  const html = await page.content();
  writeFileSync(join(OUT_DIR, `${label}.html`), html, "utf8");
  await page.screenshot({
    path: join(OUT_DIR, `${label}.png`),
    fullPage: true,
  });
  console.log(
    `[explore] ${label}: ${data.fields.length} campos, ${data.forms.length} forms -> scripts/.evol-dump/${label}.{json,html,png}`
  );
  return data;
}

/** Igual que dumpFormFields pero sobre un Frame (iframe). Screenshot de la página. */
async function dumpFrame(frame: import("playwright").Frame, page: Page, label: string) {
  const data = await frame.evaluate(() => {
    const describe = (el: Element) => {
      const e = el as HTMLInputElement;
      const attrs: Record<string, string> = {};
      for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
      let labelText = "";
      const id = el.getAttribute("id");
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) labelText = (lbl.textContent || "").trim();
      }
      if (!labelText) {
        const parentLabel = el.closest("label");
        if (parentLabel) labelText = (parentLabel.textContent || "").trim();
      }
      return {
        tag: el.tagName.toLowerCase(),
        type: e.type || null,
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        label: labelText.slice(0, 80),
        cssSuggestion: id
          ? `#${id}`
          : el.getAttribute("name")
            ? `${el.tagName.toLowerCase()}[name="${el.getAttribute("name")}"]`
            : null,
        attrs,
      };
    };
    const fields = Array.from(
      document.querySelectorAll("input, select, textarea")
    ).map(describe);
    const buttons = Array.from(
      document.querySelectorAll("button, input[type=submit], a")
    )
      .slice(0, 120)
      .map((b) => ({
        tag: b.tagName.toLowerCase(),
        type: (b as HTMLInputElement).type || null,
        text: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        id: b.getAttribute("id"),
        name: b.getAttribute("name"),
        href: b.getAttribute("href"),
        onclick: b.getAttribute("onclick"),
        classes: b.getAttribute("class"),
        dataTestid: b.getAttribute("data-testid"),
      }));
    return { url: location.href, title: document.title, fields, buttons };
  });

  writeFileSync(join(OUT_DIR, `${label}.json`), JSON.stringify(data, null, 2), "utf8");
  writeFileSync(join(OUT_DIR, `${label}.html`), await frame.content(), "utf8");
  await page.screenshot({ path: join(OUT_DIR, `${label}.png`), fullPage: true });
  console.log(
    `[explore] ${label}: ${data.fields.length} campos, ${data.buttons.length} botones/links -> scripts/.evol-dump/${label}.{json,html,png}`
  );
  return data;
}

async function main() {
  requireEnv();
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`[explore] Lanzando Chromium (headless=${HEADLESS})...`);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  // esbuild (tsx) inyecta __name en el código de page.evaluate; lo definimos
  // como identidad global en el navegador. Forma STRING para que esbuild no la
  // transforme. Se aplica a cada documento/navegación del contexto.
  await context.addInitScript(
    "globalThis.__name = globalThis.__name || function (fn) { return fn; };"
  );
  const page = await context.newPage();

  try {
    if (USE_AUTOLOGIN) {
      // --- Login por autologin (API evolCampus) como usuario admin ---
      console.log(`[explore] Autologin como admin: ${ADMIN_EMAIL}`);
      const cfg = scraperConfigFromEnv({ loginMode: "autologin" });
      const autoUrl = await getAdminAutologinUrl(cfg);
      console.log(`[explore] URL autologin obtenida. Navegando...`);
      // OJO: usamos domcontentloaded (no networkidle): el panel tiene
      // long-polling/websockets y "networkidle" nunca se resuelve.
      await page.goto(autoUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      await dumpFormFields(page, "02-post-autologin");
      console.log(`[explore] URL tras autologin: ${page.url()}`);

      // Si el panel de gestión está en otra URL, saltamos allí con la sesión activa.
      if (ADMIN_URL && !page.url().includes("gestion")) {
        console.log(`[explore] Navegando al panel de gestión: ${ADMIN_URL}`);
        await page
          .goto(ADMIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 })
          .catch(() => {});
        await page.waitForTimeout(2000);
        await dumpFormFields(page, "02b-panel-gestion");
        console.log(`[explore] URL panel gestión: ${page.url()}`);
      }
    } else {
      // --- Login por credenciales (formulario) ---
      console.log(`[explore] Abriendo ${ADMIN_URL}`);
      await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);

      // 1) Volcar la página de login tal cual llega.
      await dumpFormFields(page, "01-login");

      console.log(
        "\n[explore] Revisa scripts/.evol-dump/01-login.json para ver los inputs de login."
      );
      console.log(
        "[explore] Intentando un login heurístico (email/usuario + password + submit)...\n"
      );

      // Heurística: buscamos el primer input de texto/email y el de password.
      const userInput = page
        .locator(
          'input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]'
        )
        .first();
      const passInput = page.locator('input[type="password"]').first();

      if ((await userInput.count()) && (await passInput.count())) {
        await userInput.fill(ADMIN_USER);
        await passInput.fill(ADMIN_PASS);
        const submit = page
          .locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Acceder"), button:has-text("Login"), button:has-text("Iniciar")')
          .first();
        if (await submit.count()) {
          await Promise.all([
            page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {}),
            submit.click(),
          ]);
        } else {
          await passInput.press("Enter");
          await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
        }
        await page.waitForTimeout(2500);
        await dumpFormFields(page, "02-post-login");
        console.log(`[explore] URL tras login: ${page.url()}`);
      } else {
        console.warn(
          "[explore] No se detectaron inputs de login por heurística. Revisa 01-login.json."
        );
      }
    }

    // 2) Intentar navegar al módulo de cursos por URL directa (panel PHP).
    //    Candidatas basadas en la estructura observada (modulos/administracion/).
    // La lista/creación de cursos vive en un IFRAME (SPA nueva /em/courses/...)
    // dentro de /gestion/cursos/. Hay que operar dentro del frame.
    try {
      await page.goto(new URL("/gestion/cursos/", ADMIN_URL).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);
      const frameEl = await page
        .waitForSelector("#iframe-new-front", { timeout: 15000 })
        .catch(() => null);
      const frame = frameEl ? await frameEl.contentFrame() : null;
      if (frame) {
        console.log(`[explore] iframe cursos detectado: ${frame.url()}`);
        await page.waitForTimeout(7000);
        // Re-adquirir el frame SPA por URL (el iframe se recarga con ?rnd=...
        // cambiante y la referencia previa puede quedar obsoleta).
        const spaFrame = () =>
          page.frames().find((f) => /\/em\/courses/.test(f.url()));

        let sf = spaFrame();
        if (sf) await dumpFrame(sf, page, "04-cursos-iframe");

        try {
          console.log("[explore] Clic en botón NUEVO...");
          sf = spaFrame();
          if (!sf) throw new Error("No se encontró el frame SPA /em/courses");
          await sf.locator(".new-button").first().click({ timeout: 10000 });
          await page.waitForTimeout(1800);
          sf = spaFrame();
          if (sf) await dumpFrame(sf, page, "05-after-new-click");

          // Menú desplegable: elegir "Crear curso".
          sf = spaFrame();
          const crearCurso = sf!
            .locator('button:has-text("Crear curso"), a:has-text("Crear curso")')
            .first();
          if (await crearCurso.count()) {
            console.log('[explore] Clic en "Crear curso"...');
            await crearCurso.click({ timeout: 8000 });
            await page.waitForTimeout(4500);
          } else {
            console.log("[explore] No hay submenú; asumo formulario directo.");
            await page.waitForTimeout(3500);
          }
          sf = spaFrame();
          if (sf) await dumpFrame(sf, page, "06-course-form");
        } catch (e) {
          console.warn("[explore] Error en interacción crear curso:", e);
          const sf2 = spaFrame();
          if (sf2) await dumpFrame(sf2, page, "06-course-form-error");
        }
      } else {
        console.warn("[explore] No se encontró el iframe #iframe-new-front");
      }
    } catch (e) {
      console.warn("[explore] Error navegando a /gestion/cursos/:", e);
    }

    console.log(
      "\n[explore] Listo. Revisa la carpeta scripts/.evol-dump/ (json + html + png)."
    );
    if (!HEADLESS) {
      console.log("[explore] Ventana abierta 20s para inspección manual...");
      await page.waitForTimeout(20000);
    }
  } catch (err) {
    console.error("[explore] Error:", err);
    try {
      await dumpFormFields(page, "99-error-state");
    } catch {}
  } finally {
    await browser.close();
  }
}

main();
