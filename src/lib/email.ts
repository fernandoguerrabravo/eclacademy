/**
 * Envío de emails transaccionales con diseño de marca ECL Academy.
 * Usa Resend si está configurado; si no, registra en consola (desarrollo).
 *
 * Variables de entorno:
 *   RESEND_API_KEY   API key de Resend (https://resend.com)
 *   EMAIL_FROM       remitente, p.ej. "ECL Academy <no-reply@eclacademy.io>"
 *   NEXT_PUBLIC_SITE_URL  URL base del sitio
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "ECL Academy <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
      `\n[email:DEV] Para: ${input.to}\n[email:DEV] Asunto: ${input.subject}` +
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

function extractLinks(html: string): string[] {
  const links: string[] = [];
  const re = /href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) links.push(m[1]);
  return links;
}

// ============================================================
// Sistema de diseño: layout base de marca
// ============================================================

const COLORS = {
  dark: "#232f3e",
  darker: "#131921",
  orange: "#ff9900",
  text: "#1c1d1f",
  muted: "#6a6f73",
  border: "#e4e8eb",
  bg: "#f7f9fa",
};

/** Envuelve el contenido en el layout de marca (email-safe, responsive). */
function layout(content: string, preview = ""): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;color:${COLORS.text};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:${COLORS.dark};padding:22px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">ECL <span style="color:${COLORS.orange};">Academy</span></span>
          <span style="float:right;color:#c9ced3;font-size:11px;padding-top:6px;">Amazon Service Partner</span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="background:${COLORS.darker};padding:22px 32px;">
          <p style="margin:0;color:#c9ced3;font-size:12px;line-height:1.6;">
            <strong style="color:#fff;">Ecommerce Logistics LLC</strong><br>
            Educación para sellers de Amazon en Latinoamérica · Miami, FL, USA<br>
            <a href="${SITE_URL}" style="color:${COLORS.orange};text-decoration:none;">eclacademy.io</a>
          </p>
        </td></tr>
      </table>
      <p style="color:${COLORS.muted};font-size:11px;margin:16px 0 0;">© 2026 Ecommerce Logistics LLC. Todos los derechos reservados.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto;"><tr><td style="border-radius:6px;background:${COLORS.orange};">
    <a href="${url}" style="display:inline-block;padding:14px 34px;color:${COLORS.text};font-weight:bold;font-size:15px;text-decoration:none;border-radius:6px;">${text}</a>
  </td></tr></table>`;
}

function coursesBlock(courses: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${COLORS.bg};border-radius:8px;">
    ${courses
      .map(
        (c) =>
          `<tr><td style="padding:12px 16px;border-bottom:1px solid ${COLORS.border};font-size:14px;">🎓 &nbsp;${c}</td></tr>`
      )
      .join("")}
  </table>`;
}

// ============================================================
// Plantillas
// ============================================================

/** Email de matrícula confirmada + instrucciones de acceso. */
export function enrollmentEmail(params: {
  name: string;
  courses: string[];
  accessUrl: string;
}): { subject: string; html: string } {
  const firstName = params.name.split(" ")[0];
  const content = `
    <h1 style="font-size:22px;margin:0 0 8px;">¡Bienvenido, ${firstName}! 🎉</h1>
    <p style="font-size:15px;line-height:1.6;color:${COLORS.text};margin:0 0 4px;">
      Tu matrícula está <strong>confirmada</strong>. Ya tienes acceso a:
    </p>
    ${coursesBlock(params.courses)}

    <h2 style="font-size:16px;margin:24px 0 8px;">Cómo acceder a tus cursos</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;color:${COLORS.text};">
      <tr><td style="padding:4px 0;"><strong style="color:${COLORS.orange};">1.</strong> Pulsa el botón de abajo para entrar a tu cuenta (sin contraseña).</td></tr>
      <tr><td style="padding:4px 0;"><strong style="color:${COLORS.orange};">2.</strong> En "Mis Cursos", pulsa <strong>Ir al curso</strong>.</td></tr>
      <tr><td style="padding:4px 0;"><strong style="color:${COLORS.orange};">3.</strong> Entrarás directo al campus para empezar a estudiar.</td></tr>
    </table>

    ${button("Acceder a mis cursos", params.accessUrl)}

    <p style="font-size:12px;color:${COLORS.muted};line-height:1.6;margin:8px 0 0;">
      Este enlace es personal y válido por 7 días. Si el botón no funciona, copia y pega esta dirección en tu navegador:<br>
      <a href="${params.accessUrl}" style="color:${COLORS.orange};word-break:break-all;">${params.accessUrl}</a>
    </p>
    <p style="font-size:13px;color:${COLORS.muted};margin:20px 0 0;">¿Necesitas ayuda? Responde a este correo y te ayudamos.</p>
  `;
  return {
    subject: "🎓 Matrícula confirmada — Accede a tus cursos",
    html: layout(content, "Tu matrícula está confirmada. Accede a tus cursos."),
  };
}

/** Email de acceso por enlace (login sin contraseña). */
export function magicLinkEmail(params: {
  name: string;
  url: string;
}): { subject: string; html: string } {
  const firstName = params.name.split(" ")[0];
  const content = `
    <h1 style="font-size:20px;margin:0 0 8px;">Tu acceso a ECL Academy</h1>
    <p style="font-size:15px;line-height:1.6;margin:0;">
      Hola ${firstName}, entra a tu cuenta con este enlace seguro (no necesitas contraseña):
    </p>
    ${button("Acceder a mi cuenta", params.url)}
    <p style="font-size:12px;color:${COLORS.muted};line-height:1.6;">
      Válido por 7 días. Si no solicitaste esto, ignora este correo.
    </p>
  `;
  return {
    subject: "Tu enlace de acceso a ECL Academy",
    html: layout(content, "Tu enlace de acceso a ECL Academy"),
  };
}

/** Email de confirmación de reembolso. */
export function refundEmail(params: {
  name: string;
  courses: string[];
  amount: number;
}): { subject: string; html: string } {
  const firstName = params.name.split(" ")[0];
  const content = `
    <h1 style="font-size:20px;margin:0 0 8px;">Reembolso procesado</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 4px;">
      Hola ${firstName}, hemos procesado el reembolso de <strong>$${params.amount}</strong> por:
    </p>
    ${coursesBlock(params.courses)}
    <p style="font-size:14px;line-height:1.6;color:${COLORS.text};">
      El acceso a estos cursos ha sido dado de baja. El reembolso puede tardar
      algunos días hábiles en reflejarse según tu banco.
    </p>
    <p style="font-size:13px;color:${COLORS.muted};margin:20px 0 0;">Si tienes dudas, responde a este correo.</p>
  `;
  return {
    subject: "Tu reembolso en ECL Academy",
    html: layout(content, "Hemos procesado tu reembolso."),
  };
}
