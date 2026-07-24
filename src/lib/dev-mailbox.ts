import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Buzón de correos para DESARROLLO/DEMO.
 * Cuando Resend no está configurado, los correos se guardan aquí y se pueden
 * ver renderizados en /dev/mailbox. Solo activo fuera de producción.
 */

const DIR = join(process.cwd(), ".devmail");

export interface DevEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  date: string;
}

function ensureDir() {
  try {
    mkdirSync(DIR, { recursive: true });
  } catch {
    // ignore
  }
}

export function saveDevEmail(email: { to: string; subject: string; html: string }) {
  if (process.env.NODE_ENV === "production") return;
  ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: DevEmail = { id, ...email, date: new Date().toISOString() };
  try {
    writeFileSync(join(DIR, `${id}.json`), JSON.stringify(record), "utf8");
  } catch (err) {
    console.error("[dev-mailbox] no se pudo guardar:", err);
  }
}

export function listDevEmails(): Omit<DevEmail, "html">[] {
  ensureDir();
  try {
    return readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const r = JSON.parse(readFileSync(join(DIR, f), "utf8")) as DevEmail;
        return { id: r.id, to: r.to, subject: r.subject, date: r.date };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function getDevEmail(id: string): DevEmail | null {
  try {
    const safe = id.replace(/[^a-z0-9-]/gi, "");
    const r = JSON.parse(readFileSync(join(DIR, `${safe}.json`), "utf8"));
    return r as DevEmail;
  } catch {
    return null;
  }
}
