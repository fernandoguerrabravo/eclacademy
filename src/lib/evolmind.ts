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
  // Creación de cursos (solo si tu instancia de evolCampus lo soporta).
  // Desactivado por defecto: EVOLMIND_COURSE_CREATE_ENABLED=true para activar.
  courseCreateEnabled: process.env.EVOLMIND_COURSE_CREATE_ENABLED === "true",
  courseCreateAction: process.env.EVOLMIND_COURSE_ACTION || "addCourse",
  fieldCourseName: process.env.EVOLMIND_FIELD_COURSE_NAME || "name",
  fieldCourseCode: process.env.EVOLMIND_FIELD_COURSE_CODE || "code",
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

// ============================================================
// Creación de cursos en evolCampus
// ============================================================

export interface CourseCreateInput {
  /** Nombre del curso */
  name: string;
  /** Código sugerido (p.ej. el slug). evolCampus puede devolver otro. */
  code: string;
  description?: string;
}

export interface CourseCreateResult {
  success: boolean;
  /** Código/ID del curso en evolCampus para usar en matrículas */
  evolmindCourseId?: string;
  message: string;
  raw?: string;
  simulated?: boolean;
}

/**
 * Indica si la creación de cursos vía API está habilitada y configurada.
 * IMPORTANTE: la API pública de evolCampus está orientada a matrícula; confirma
 * con su soporte si tu cuenta expone un endpoint para crear cursos. Si no,
 * los cursos se crean en su editor y aquí solo se enlaza el código.
 */
export function isCourseCreateEnabled(): boolean {
  return cfg.courseCreateEnabled && isEvolmindConfigured();
}

/**
 * Crea (o registra) un curso en evolCampus y devuelve su código.
 * - Si la creación por API no está habilitada, devuelve un resultado
 *   "pendiente de enlace manual" (no falla el flujo).
 */
export async function createCourse(
  input: CourseCreateInput
): Promise<CourseCreateResult> {
  if (!isCourseCreateEnabled()) {
    return {
      success: false,
      message:
        "Creación de curso por API no habilitada. Crea el curso en evolCampus y enlaza su código manualmente.",
      simulated: true,
    };
  }

  const params = new URLSearchParams();
  params.set(cfg.keyParam, cfg.key || "");
  params.set(cfg.actionParam, cfg.courseCreateAction);
  params.set(cfg.fieldCourseName, input.name);
  params.set(cfg.fieldCourseCode, input.code);
  if (input.description) params.set("description", input.description);
  if (cfg.accountId) params.set("accountId", cfg.accountId);

  try {
    const res = await fetchWithTimeout(cfg.url as string, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await res.text();

    if (!res.ok) {
      return {
        success: false,
        message: `HTTP ${res.status}: ${text.slice(0, 300)}`,
        raw: text,
      };
    }

    // Intenta extraer el código/id del curso de la respuesta
    let evolmindCourseId: string | undefined = input.code;
    try {
      const json = JSON.parse(text);
      evolmindCourseId =
        json.courseId || json.code || json.id || input.code;
    } catch {
      // respuesta no-JSON
    }

    return {
      success: true,
      evolmindCourseId,
      message: "Curso creado/registrado en evolCampus",
      raw: text,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Error de red desconocido",
    };
  }
}
