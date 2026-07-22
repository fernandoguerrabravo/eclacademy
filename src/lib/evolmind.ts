/**
 * Integración con Evolmind / evolCampus (LMS) para matricular estudiantes.
 *
 * evolCampus expone una API para matricular alumnos automáticamente desde una
 * tienda online, usando una CLAVE PRIVADA. Los nombres exactos de endpoint,
 * acción y campos dependen de tu cuenta, por eso son CONFIGURABLES por entorno.
 *
 * Variables de entorno (ver .env.local.example):
 *   EVOLMIND_API_URL        URL del endpoint de la API
 *   EVOLMIND_API_KEY        Clave privada de la API
 *   EVOLMIND_ACCOUNT_ID     (opcional) identificador de cuenta
 *   EVOLMIND_REQUEST_FORMAT "form" (por defecto) | "json"
 *   EVOLMIND_KEY_PARAM      nombre del parámetro de la clave (def. "key")
 *   EVOLMIND_ENROLL_ACTION  valor de la acción de matrícula (def. "subscribe")
 *   EVOLMIND_ACTION_PARAM   nombre del parámetro de acción (def. "action")
 *
 * Mapeo de campos (por si tu instancia usa otros nombres):
 *   EVOLMIND_FIELD_EMAIL    (def. "email")
 *   EVOLMIND_FIELD_NAME     (def. "name")
 *   EVOLMIND_FIELD_COURSE   (def. "course")
 */

const cfg = {
  url: process.env.EVOLMIND_API_URL,
  key: process.env.EVOLMIND_API_KEY,
  accountId: process.env.EVOLMIND_ACCOUNT_ID,
  format: (process.env.EVOLMIND_REQUEST_FORMAT || "form") as "form" | "json",
  keyParam: process.env.EVOLMIND_KEY_PARAM || "key",
  actionParam: process.env.EVOLMIND_ACTION_PARAM || "action",
  enrollAction: process.env.EVOLMIND_ENROLL_ACTION || "subscribe",
  fieldEmail: process.env.EVOLMIND_FIELD_EMAIL || "email",
  fieldName: process.env.EVOLMIND_FIELD_NAME || "name",
  fieldCourse: process.env.EVOLMIND_FIELD_COURSE || "course",
};

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export interface EnrollmentInput {
  email: string;
  name: string;
  /** ID/código del curso en Evolmind (Course.evolmindCourseId) */
  evolmindCourseId: string;
  /** Referencia del pago (Stripe session id) para trazabilidad */
  paymentReference?: string;
}

export interface EnrollmentResult {
  success: boolean;
  enrollmentId?: string;
  message: string;
  /** Respuesta cruda del proveedor (para depurar / auditar) */
  raw?: string;
  /** true si fue simulada por falta de configuración */
  simulated?: boolean;
}

export function isEvolmindConfigured(): boolean {
  return Boolean(cfg.url && cfg.key);
}

/** Construye el cuerpo de la petición según el formato configurado. */
function buildRequest(input: EnrollmentInput): {
  body: string;
  headers: Record<string, string>;
} {
  const [firstName, ...rest] = input.name.trim().split(" ");
  const lastName = rest.join(" ");

  if (cfg.format === "json") {
    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [cfg.keyParam]: cfg.key,
        [cfg.actionParam]: cfg.enrollAction,
        [cfg.fieldEmail]: input.email,
        [cfg.fieldName]: input.name,
        firstName,
        lastName,
        [cfg.fieldCourse]: input.evolmindCourseId,
        accountId: cfg.accountId,
        reference: input.paymentReference,
      }),
    };
  }

  // form-urlencoded (patrón típico de evolCampus)
  const params = new URLSearchParams();
  params.set(cfg.keyParam, cfg.key || "");
  params.set(cfg.actionParam, cfg.enrollAction);
  params.set(cfg.fieldEmail, input.email);
  params.set(cfg.fieldName, input.name);
  params.set("firstName", firstName);
  params.set("lastName", lastName);
  params.set(cfg.fieldCourse, input.evolmindCourseId);
  if (cfg.accountId) params.set("accountId", cfg.accountId);
  if (input.paymentReference) params.set("reference", input.paymentReference);

  return {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  };
}

/** Realiza un fetch con timeout. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Matricula a un estudiante en un curso de Evolmind.
 * - Si no está configurado, simula éxito (para no bloquear en desarrollo).
 * - Reintenta ante errores transitorios (red / 5xx).
 */
export async function enrollStudent(
  input: EnrollmentInput
): Promise<EnrollmentResult> {
  if (!isEvolmindConfigured()) {
    console.warn(
      `[evolmind] No configurado. Matrícula simulada: ${input.email} -> ${input.evolmindCourseId}`
    );
    return {
      success: true,
      enrollmentId: `SIMULATED-${Date.now()}`,
      message: "Matrícula simulada (Evolmind no configurado)",
      simulated: true,
    };
  }

  const { body, headers } = buildRequest(input);
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(cfg.url as string, {
        method: "POST",
        headers,
        body,
      });

      const text = await res.text();

      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
        // Reintenta solo en errores del servidor (5xx)
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await delay(500 * (attempt + 1));
          continue;
        }
        return { success: false, message: lastError, raw: text };
      }

      // Intenta extraer un id de la respuesta (JSON o texto)
      let enrollmentId: string | undefined;
      try {
        const json = JSON.parse(text);
        enrollmentId =
          json.id || json.enrollmentId || json.subscriptionId || undefined;
      } catch {
        // respuesta no-JSON: la dejamos como raw
      }

      return {
        success: true,
        enrollmentId,
        message: "Estudiante matriculado en Evolmind",
        raw: text,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Error de red desconocido";
      if (attempt < MAX_RETRIES) {
        await delay(500 * (attempt + 1));
        continue;
      }
    }
  }

  console.error(`[evolmind] Falló tras ${MAX_RETRIES + 1} intentos: ${lastError}`);
  return { success: false, message: lastError };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
