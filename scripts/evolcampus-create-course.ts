/**
 * CLI para crear un curso en evolCampus vía scraping (Playwright).
 *
 * Uso:
 *   npm run evol:create-course -- --name "Cumplimiento FDA" --desc "Curso ..."
 *   npm run evol:create-course -- --name "Curso X" --headless
 *
 * Requiere credenciales en .env.local (EVOLCAMPUS_ADMIN_URL/USER/PASS) y los
 * selectores reales en scripts/evol-selectors.json (ver npm run evol:explore).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { createCourseViaScraper } from "../src/lib/evolcampus-scraper";

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const name = getArg("--name");
  const description = getArg("--desc");
  const headless = process.argv.includes("--headless");

  if (!name) {
    console.error('Uso: npm run evol:create-course -- --name "Nombre del curso" [--desc "..."] [--headless]');
    process.exit(1);
  }

  console.log(`[create-course] Creando "${name}" (headless=${headless})...`);
  const res = await createCourseViaScraper(
    { name, description },
    { headless }
  );

  console.log("[create-course] Resultado:", JSON.stringify(res, null, 2));
  process.exit(res.success ? 0 : 1);
}

main();
