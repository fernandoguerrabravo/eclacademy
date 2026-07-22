/**
 * Integración con Evolmind (LMS) para matricular estudiantes
 * tras un pago exitoso.
 *
 * NOTA: Los endpoints exactos dependen de tu instancia de Evolmind.
 * Ajusta las rutas y el formato del payload según su documentación oficial.
 * La configuración se toma de variables de entorno.
 */

const EVOLMIND_API_URL = process.env.EVOLMIND_API_URL;
const EVOLMIND_API_KEY = process.env.EVOLMIND_API_KEY;
const EVOLMIND_ACCOUNT_ID = process.env.EVOLMIND_ACCOUNT_ID;

export interface EnrollmentInput {
  email: string;
  name: string;
  /** ID del curso en Evolmind (Course.evolmindCourseId) */
  evolmindCourseId: string;
  /** Referencia del pago (Stripe session/payment id) para trazabilidad */
  paymentReference?: string;
}

export interface EnrollmentResult {
  success: boolean;
  enrollmentId?: string;
  message: string;
}

export function isEvolmindConfigured(): boolean {
  return Boolean(EVOLMIND_API_URL && EVOLMIND_API_KEY);
}

/**
 * Matricula a un estudiante en un curso de Evolmind.
 * Si Evolmind no está configurado, registra la intención y retorna éxito simulado
 * para no bloquear el flujo de compra en desarrollo.
 */
export async function enrollStudent(
  input: EnrollmentInput
): Promise<EnrollmentResult> {
  if (!isEvolmindConfigured()) {
    console.warn(
      `[evolmind] No configurado. Matrícula simulada para ${input.email} en ${input.evolmindCourseId}`
    );
    return {
      success: true,
      enrollmentId: `SIMULATED-${Date.now()}`,
      message: "Matrícula simulada (Evolmind no configurado)",
    };
  }

  try {
    const response = await fetch(`${EVOLMIND_API_URL}/enrollments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EVOLMIND_API_KEY}`,
        "X-Account-Id": EVOLMIND_ACCOUNT_ID || "",
      },
      body: JSON.stringify({
        student: {
          email: input.email,
          name: input.name,
        },
        courseId: input.evolmindCourseId,
        source: "ecl-academy-web",
        paymentReference: input.paymentReference,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[evolmind] Error ${response.status}: ${errorText}`);
      return {
        success: false,
        message: `Error al matricular en Evolmind: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      enrollmentId: data.id || data.enrollmentId,
      message: "Estudiante matriculado correctamente en Evolmind",
    };
  } catch (error) {
    console.error("[evolmind] Excepción al matricular:", error);
    return {
      success: false,
      message: "Excepción al conectar con Evolmind",
    };
  }
}
