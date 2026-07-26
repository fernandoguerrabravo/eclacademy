/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright es una herramienta de servidor (scraper de evolCampus). No debe
  // empaquetarse en el bundle de Next: se resuelve en runtime desde node_modules.
  // Es una devDependency y solo se usa localmente por ahora (creación de cursos).
  experimental: {
    serverComponentsExternalPackages: ["playwright", "playwright-core"],
  },
};

module.exports = nextConfig;
