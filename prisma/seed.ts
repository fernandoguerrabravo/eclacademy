/**
 * El catálogo de cursos proviene de evolCampus (fuente de verdad).
 * No se siembran cursos demo. Para poblar el catálogo:
 *   1. Arranca la app y entra en /admin
 *   2. Pulsa "Sincronizar desde evolCampus"
 *   3. Fija precio y publica cada curso
 *
 * Este script queda como punto de extensión para datos base futuros
 * (p.ej. usuario administrador, categorías, etc.).
 */
async function main() {
  console.log(
    "Seed: el catálogo se importa desde evolCampus vía /admin (Sincronizar). Nada que sembrar."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
