/**
 * Envío de emails. Usa Resend si está configurado; si no, registra el
 * contenido en consola (modo desarrollo) para no bloquear el flujo.
 *
 * Variables de entorno:
 *   RESEND_API_KEY   API key de Resend (https://resend.com)
 *   EMAIL_FROM       remitente, p.ej. "ECL Academy <no-reply@eclacademy.io>"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "ECL Academy <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    const links = extractLinks(input.html);
    console.log(
      `\n[email:DEV] Para: ${input.to}\n[email:DEV] Asunto: ${input.subject}\n[email:DEV] ${stripHtml(input.html)}` +
        (links.length ? `\n[email:DEV] Enlaces:\n${links.map((l) => "  " + l).join("\n")}` : "") +
        `\n[email:DEV] (configura RESEND_API_KEY para envío real)\n`
    );
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] Error ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Excepción:", err);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) links.push(m[1]);
  return links;
}

/** Plantilla del email de acceso (magic link) tras la matrícula. */
export function magicLinkEmail(params: {
  name: string;
  url: string;
  courses: string[];
}): { subject: string; html: string } {
  const coursesList = params.courses
    .map((c) => `<li style="margin:4px 0;">${c}</li>`)
    .join("");

  return {
    subject: "Tu acceso a ECL Academy 🎓",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1c1d1f;">
        <div style="background:#232f3e;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
          <span style="color:#fff;font-size:20px;font-weight:bold;">ECL <span style="color:#ff9900;">Academy</span></span>
        </div>
        <div style="border:1px solid #eee;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
          <h1 style="font-size:20px;">¡Hola, ${params.name}!</h1>
          <p>Tu matrícula está confirmada. Ya tienes acceso a:</p>
          <ul style="padding-left:20px;">${coursesList}</ul>
          <p>Entra a tu cuenta con este enlace seguro (no necesitas contraseña):</p>
          <p style="text-align:center;margin:28px 0;">
            <a href="${params.url}" style="background:#ff9900;color:#1c1d1f;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;display:inline-block;">
              Acceder a mis cursos
            </a>
          </p>
          <p style="font-size:12px;color:#6a6f73;">Este enlace es válido por 7 días. Si no solicitaste esto, ignora este correo.</p>
          <p style="font-size:12px;color:#6a6f73;">Ecommerce Logistics LLC · Amazon Service Partner</p>
        </div>
      </div>
    `,
  };
}
