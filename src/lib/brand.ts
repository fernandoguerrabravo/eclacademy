/**
 * Configuración de MARCA centralizada y parametrizable.
 *
 * Todo el texto de marca (nombre, empresa, tagline, ciudad, logos, colores,
 * redes) vive aquí. Los componentes y páginas leen de `brand` en vez de tener
 * los textos "hardcodeados". Para clonar el proyecto para otra marca:
 *   1) Cambia estos valores (o sobreescríbelos por variables de entorno).
 *   2) Reemplaza los logos en /public.
 *   3) Ajusta la paleta en globals.css (:root) o brand.colors.
 *
 * Overrides por entorno (opcional): como se usan en componentes de cliente,
 * deben llevar el prefijo NEXT_PUBLIC_. Si no se definen, se usan los valores
 * por defecto de abajo (los actuales de ECL Academy).
 */

const env = (k: string, fallback: string) =>
  (process.env[k] && String(process.env[k])) || fallback;

export const brand = {
  /** Nombre corto del sitio/academia, p.ej. "ECL Academy" */
  name: env("NEXT_PUBLIC_BRAND_NAME", "ECL Academy"),
  /** Nombre corto en 2 partes para el logo tipográfico (prefijo + resaltado) */
  namePrefix: env("NEXT_PUBLIC_BRAND_NAME_PREFIX", "ECL"),
  nameHighlight: env("NEXT_PUBLIC_BRAND_NAME_HIGHLIGHT", "Academy"),
  /** Razón social / creador de contenidos */
  company: env("NEXT_PUBLIC_BRAND_COMPANY", "Ecommerce Logistics LLC"),
  /** Lema para el título/SEO */
  tagline: env("NEXT_PUBLIC_BRAND_TAGLINE", "Tu Puerta al Mercado de EE.UU."),
  /** Descripción SEO */
  description: env(
    "NEXT_PUBLIC_BRAND_DESCRIPTION",
    "Talleres especializados para sellers de Amazon en Latinoamérica. Cumplimiento aduanero, FDA, USDA, logística, fintech y comercio internacional."
  ),
  /** Descripción corta para footer/emails */
  shortDescription: env(
    "NEXT_PUBLIC_BRAND_SHORT_DESCRIPTION",
    "Educación especializada para sellers de Amazon en Latinoamérica que buscan expandirse al mercado de Estados Unidos."
  ),
  /** Ubicación (footer/emails) */
  city: env("NEXT_PUBLIC_BRAND_CITY", "Miami, FL, USA"),
  /** Dominio visible (footer/emails) */
  domain: env("NEXT_PUBLIC_BRAND_DOMAIN", "eclacademy.io"),
  /** URL base del sitio */
  siteUrl: env("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  /** Rutas de logos en /public */
  logo: env("NEXT_PUBLIC_BRAND_LOGO", "/logoecl.png"),
  partnerLogo: env("NEXT_PUBLIC_BRAND_PARTNER_LOGO", "/spn-logo.jpeg"),
  /** Año para el copyright */
  year: env("NEXT_PUBLIC_BRAND_YEAR", "2026"),
  /** Redes sociales (footer). Deja "#" para ocultar/placeholder. */
  social: {
    facebook: env("NEXT_PUBLIC_BRAND_FACEBOOK", "#"),
    instagram: env("NEXT_PUBLIC_BRAND_INSTAGRAM", "#"),
    linkedin: env("NEXT_PUBLIC_BRAND_LINKEDIN", "#"),
    youtube: env("NEXT_PUBLIC_BRAND_YOUTUBE", "#"),
  },
  /** Paleta principal (informativa; el CSS usa :root en globals.css). */
  colors: {
    primary: env("NEXT_PUBLIC_BRAND_PRIMARY", "#ff9900"),
    dark: env("NEXT_PUBLIC_BRAND_DARK", "#232f3e"),
    darker: env("NEXT_PUBLIC_BRAND_DARKER", "#131921"),
  },
};

/** Título completo para <title> / SEO. */
export const brandTitle = `${brand.name} | ${brand.company} - ${brand.tagline}`;
