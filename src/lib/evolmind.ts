/**
 * Cliente de la API de evolCampus (EvolMind).
 * Doc oficial v26.01 — Base URL: https://api.evolcampus.com/api
 *
 * Autenticación: JWT.
 *   POST /v1/token { clientid, key } -> { token }
 *   Las demás llamadas usan header  Authorization: Bearer <token>
 *
 * Variables de entorno (.env.local):
 *   EVOLMIND_API_URL    (def. https://api.evolcampus.com/api)
 *   EVOLMIND_CLIENT_ID  identificador de cliente (int)
 *   EVOLMIND_API_KEY    clave única de cliente
 */

const BASE_URL =
  process.env.EVOLMIND_API_URL || "https://api.evolcampus.com/api";
const CLIENT_ID = process.env.EVOLMIND_CLIENT_ID;
const API_KEY = process.env.EVOLMIND_API_KEY;

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export function isEvolmindConfigured(): boolean {
  return Boolean(CLIENT_ID && API_KEY);
}

// ---------- Token (JWT) con cache en memoria ----------
let cachedToken: { value: string; expiresAt: number } | null = null;

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

/** Decodifica el exp de un JWT (segundos epoch) sin verificar la firma. */
function decodeJwtExp(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const res = await fetchWithTimeout(`${BASE_URL}/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientid: Number(CLIENT_ID), key: API_KEY }),
  });

  if (!res.ok) {
    throw new Error(`[evolmind] token HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const token: string = data.token || (Array.isArray(data) ? data[0] : "");
  if (!token) throw new Error("[evolmind] token vacío en la respuesta");

  const exp = decodeJwtExp(token);
  cachedToken = {
    value: token,
    expiresAt: exp ? exp * 1000 : now + 50 * 60_000, // fallback 50 min
  };
  return token;
}

/** POST autenticado con cuerpo form-urlencoded (PHP bracket style). */
async function apiPostForm(
  path: string,
  fields: Record<string, string | number | undefined>
): Promise<any> {
  const token = await getToken();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const text = await res.text();
      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await delay(500 * (attempt + 1));
          continue;
        }
        throw new Error(lastError);
      }
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "error de red";
      if (attempt < MAX_RETRIES) {
        await delay(500 * (attempt + 1));
        continue;
      }
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

async function apiGet(path: string): Promise<any> {
  const token = await getToken();
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Matrícula de alumnos (newEnrollment)
// ============================================================

export interface EnrollmentInput {
  email: string;
  name: string;
  lastname?: string;
  /** groupid de evolCampus donde matricular (Course.evolmindGroupId) */
  groupid?: number;
  /** referencia externa (p.ej. id de la orden) para trazabilidad en evolCampus */
  externalId?: string;
  /** enviar email de bienvenida desde evolCampus (0|1) */
  welcomeEmail?: boolean;
  /** empresa (B2B) a la que se asigna el alumno */
  companyId?: number;
}

export interface EnrollmentResult {
  success: boolean;
  message: string;
  enrollmentId?: string;
  userId?: number;
  learnerId?: number;
  raw?: any;
  simulated?: boolean;
}

/**
 * Crea una matrícula en evolCampus (POST /v1/newEnrollment).
 * Si no está configurado, simula éxito para no bloquear el flujo en desarrollo.
 */
export async function enrollStudent(
  input: EnrollmentInput
): Promise<EnrollmentResult> {
  if (!isEvolmindConfigured()) {
    console.warn(
      `[evolmind] No configurado. Matrícula simulada: ${input.email} (group ${input.groupid ?? "-"})`
    );
    return {
      success: true,
      enrollmentId: `SIMULATED-${Date.now()}`,
      message: "Matrícula simulada (Evolmind no configurado)",
      simulated: true,
    };
  }

  const [firstName, ...rest] = (input.name || "").trim().split(" ");
  const lastname = input.lastname || rest.join(" ") || firstName || "-";

  try {
    const data = await apiPostForm("/v1/newEnrollment", {
      "enroll[groupid]": input.groupid,
      "enroll[external_id]": input.externalId,
      "enroll[welcomeemail]": input.welcomeEmail ? 1 : 0,
      "person[email]": input.email,
      "person[username]": input.email,
      "person[name]": firstName || input.email.split("@")[0],
      "person[lastname]": lastname,
      "person[companyid]": input.companyId,
    });

    if (data.result === 1 || data.result === "1") {
      return {
        success: true,
        message: data.message || "OK",
        enrollmentId: data.enrollmentid ? String(data.enrollmentid) : undefined,
        userId: data.userid,
        learnerId: data.learnerid,
        raw: data,
      };
    }

    return {
      success: false,
      message: data.message || data.error || "Respuesta no exitosa de evolCampus",
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

/**
 * Actualiza el estado de una matrícula en evolCampus (POST /v1/updateEnrollment).
 * status: 0=activa, 1=archivada, 2=baja, 3=solo lectura
 */
export async function updateEnrollmentStatus(
  enrollmentId: number,
  status: 0 | 1 | 2 | 3
): Promise<{ success: boolean; message: string }> {
  if (!isEvolmindConfigured()) {
    return { success: true, message: "Simulado (Evolmind no configurado)" };
  }
  try {
    const data = await apiPostForm("/v1/updateEnrollment", {
      enrollmentid: enrollmentId,
      status,
    });
    const ok = data.result === 1 || data.result === "1";
    return {
      success: ok,
      message: data.message || data.error || (ok ? "OK" : "KO"),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Error",
    };
  }
}

// ============================================================
// Cursos y grupos (para enlazar en nuestra app)
// ============================================================

export interface EvolmindCourse {
  id: number;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  subjects?: { subjectid: number; subject: string }[];
}

/** GET /v1/getCourses — lista los cursos existentes en evolCampus. */
export async function getEvolmindCourses(): Promise<EvolmindCourse[]> {
  const data = await apiGet("/v1/getCourses");
  return data.courses || [];
}

export interface EvolmindGroup {
  id: number;
  name: string;
  status: string;
  numstudents?: number;
  type?: string; // ASYNCRONOUS | SYNCRONOUS
  startdate?: string | null;
  enddate?: string | null;
  duration?: number; // días (asíncrono)
}

/** POST /v1/getCourseGroups — grupos de un curso de evolCampus. */
export async function getEvolmindCourseGroups(
  courseId: number,
  status = "ACTIVE"
): Promise<EvolmindGroup[]> {
  const data = await apiPostForm("/v1/getCourseGroups", {
    idCourse: courseId,
    status,
  });
  return (data.groups || []).map((g: any) => ({
    id: Number(g.id),
    name: g.name,
    status: g.status,
    numstudents: g.numstudents != null ? Number(g.numstudents) : undefined,
    type: g.type,
    startdate: g.startdate ?? null,
    enddate: g.enddate ?? null,
    duration: g.duration != null ? Number(g.duration) : undefined,
  }));
}

export interface CreateGroupInput {
  courseId: number;
  name: string;
  /** "A" asíncrono | "S" síncrono */
  type: "A" | "S";
  /** días de duración (asíncrono) */
  daysDuration?: number;
  /** fecha inicio (síncrono) Y-m-d */
  startDate?: string;
  /** fecha fin (síncrono) Y-m-d */
  endDate?: string;
  classHours?: number;
}

export interface CreateGroupResult {
  success: boolean;
  message: string;
  groupId?: number;
  raw?: any;
}

/**
 * Crea un grupo asociado a un curso en evolCampus (POST /v1/newGroup).
 * Para asíncronos requiere daysDuration; para síncronos startDate y endDate.
 */
export async function createGroup(
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  if (!isEvolmindConfigured()) {
    return { success: false, message: "evolCampus no configurado" };
  }
  try {
    const data = await apiPostForm("/v1/newGroup", {
      courseid: input.courseId,
      name: input.name,
      type: input.type,
      days_duration: input.type === "A" ? input.daysDuration : undefined,
      start_date: input.type === "S" ? input.startDate : undefined,
      end_date: input.type === "S" ? input.endDate : undefined,
      class_hours: input.classHours,
    });
    const ok = data.result === 1 || data.result === "1";
    return {
      success: ok,
      message: data.message || (ok ? "OK" : "KO"),
      groupId: data.groupid ? Number(data.groupid) : undefined,
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Error",
    };
  }
}

export interface EvolmindCourseWithGroups {
  id: number;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  ngroups?: number;
  tags?: string[];
  subjects?: { subjectid: number | string; subject: string }[];
  groups?: {
    groupid: number;
    group: string;
    type: string;
  }[];
}

/**
 * GET /v1/getCoursesGroups — cursos activos con sus grupos, en una sola llamada.
 * Ideal para sincronizar el catálogo local.
 */
export async function getEvolmindCoursesWithGroups(): Promise<
  EvolmindCourseWithGroups[]
> {
  const data = await apiGet("/v1/getCoursesGroups");
  return data.courses || [];
}

// ============================================================
// Empresas (B2B)
// ============================================================

export interface EvolmindCompany {
  idEmpresaCliente: number;
  sEmpresa: string;
  sCif: string;
}

/** POST /v1/getCompaniesClient — empresas disponibles en evolCampus. */
export async function getEvolmindCompanies(): Promise<EvolmindCompany[]> {
  if (!isEvolmindConfigured()) return [];
  try {
    const data = await apiPostForm("/v1/getCompaniesClient", {});
    return data.empresas || [];
  } catch (err) {
    console.error("[evolmind] getCompaniesClient:", err);
    return [];
  }
}

export interface CreateCompanyResult {
  success: boolean;
  message: string;
  companyId?: number;
}

/** POST /v1/newCompany — crea una empresa a la que asociar alumnos. */
export async function createCompany(params: {
  name: string;
  documentId?: string;
}): Promise<CreateCompanyResult> {
  if (!isEvolmindConfigured()) {
    return { success: false, message: "evolCampus no configurado" };
  }
  try {
    const data = await apiPostForm("/v1/newCompany", {
      company_name: params.name,
      documentid: params.documentId,
    });
    const ok = data.result === 1 || data.result === "1";
    return {
      success: ok,
      message: ok ? "OK" : data.error || "KO",
      companyId: data.companyid ? Number(data.companyid) : undefined,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error" };
  }
}

// ============================================================
// Progreso de matrículas (getEnrollment / getEnrollments)
// ============================================================

export interface EnrollmentProgress {
  completedPercent: number;
  evaluationsCompletedPercent: number;
  grade: number;
  status: number; // 0 activa, 1 archivada, 2 baja, 3 solo lectura
  lastConnect: string | null;
  timeConnected: number; // segundos
  connections: number;
  begin: string | null;
  end: string | null;
  passRequirements: boolean;
  diplomaUrl: string | null;
}

function parseEnroll(enroll: any): EnrollmentProgress {
  return {
    completedPercent: Number(enroll?.completedpercent ?? 0),
    evaluationsCompletedPercent: Number(enroll?.evaluationscompletedpercent ?? 0),
    grade: Number(enroll?.grade ?? 0),
    status: Number(enroll?.enrollmentstatus ?? 0),
    lastConnect: enroll?.lastconnect || null,
    timeConnected: Number(enroll?.timeconnected ?? 0),
    connections: Number(enroll?.connections ?? 0),
    begin: enroll?.begin || null,
    end: enroll?.end || null,
    passRequirements: enroll?.passrequierements === 1 || enroll?.passrequierements === "1",
    diplomaUrl: enroll?.urldiploma || null,
  };
}

/** POST /v1/getEnrollment — datos y progreso de una matrícula. */
export async function getEnrollmentProgress(
  evEnrollmentId: number
): Promise<EnrollmentProgress | null> {
  if (!isEvolmindConfigured()) return null;
  try {
    const data = await apiPostForm("/v1/getEnrollment", {
      enrollmentid: evEnrollmentId,
    });
    if (!data?.enroll) return null;
    return parseEnroll(data.enroll);
  } catch (err) {
    console.error("[evolmind] getEnrollment:", err);
    return null;
  }
}

export interface EnrollmentProgressRow {
  enrollmentId: number;
  email: string;
  completedPercent: number;
  grade: number;
  status: number;
  lastConnect: string | null;
  diplomaUrl: string | null;
}

/**
 * POST /v1/getEnrollments — progreso de todas las matrículas de un grupo
 * en una sola llamada (hasta 1000). Devuelve un mapa por enrollmentId.
 */
export async function getEnrollmentsByGroup(
  groupId: number
): Promise<Map<number, EnrollmentProgressRow>> {
  const map = new Map<number, EnrollmentProgressRow>();
  if (!isEvolmindConfigured()) return map;
  try {
    const data = await apiPostForm("/v1/getEnrollments", {
      groupid: groupId,
      regs_per_page: 1000,
      page: 1,
    });
    const rows = data?.data || [];
    for (const r of rows) {
      const enrollmentId = Number(r?.person?.enrollmentid);
      if (!enrollmentId) continue;
      map.set(enrollmentId, {
        enrollmentId,
        email: r?.person?.email || "",
        completedPercent: Number(r?.enroll?.completedpercent ?? 0),
        grade: Number(r?.enroll?.grade ?? 0),
        status: Number(r?.enroll?.enrollmentstatus ?? 0),
        lastConnect: r?.enroll?.lastconnect || null,
        diplomaUrl: r?.enroll?.urldiploma || null,
      });
    }
  } catch (err) {
    console.error("[evolmind] getEnrollments:", err);
  }
  return map;
}

/**
 * POST /v1/extendEnrollmentTime — amplía la fecha fin de una matrícula
 * asíncrona, por días o hasta una fecha.
 */
export async function extendEnrollmentTime(
  evEnrollmentId: number,
  opts: { days?: number; date?: string }
): Promise<{ success: boolean; message: string }> {
  if (!isEvolmindConfigured()) {
    return { success: false, message: "evolCampus no configurado" };
  }
  const byDays = opts.days != null;
  try {
    const data = await apiPostForm("/v1/extendEnrollmentTime", {
      enrollmentid: evEnrollmentId,
      extend_by_days: byDays ? 1 : 0,
      extenddays: byDays ? opts.days : undefined,
      extenddate: !byDays ? opts.date : undefined,
    });
    const ok = data.result === 1 || data.result === "1";
    return { success: ok, message: data.message || (ok ? "OK" : "KO") };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error" };
  }
}

/** POST /v1/updateGroup — modifica un grupo existente. */
export async function updateGroup(
  groupId: number,
  fields: {
    name?: string;
    daysDuration?: number;
    startDate?: string;
    endDate?: string;
    classHours?: number;
  }
): Promise<{ success: boolean; message: string }> {
  if (!isEvolmindConfigured()) {
    return { success: false, message: "evolCampus no configurado" };
  }
  try {
    const data = await apiPostForm("/v1/updateGroup", {
      groupid: groupId,
      name: fields.name,
      days_duration: fields.daysDuration,
      start_date: fields.startDate,
      end_date: fields.endDate,
      class_hours: fields.classHours,
    });
    const ok = data.result === 1 || data.result === "1";
    return { success: ok, message: data.message || (ok ? "OK" : "KO") };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error" };
  }
}

// ============================================================
// Acceso directo (autologin) — para "Ir al curso"
// ============================================================

/** POST /v1/getUrlAutologin — URL de acceso directo (válida 1 día). */
export async function getAutologinUrl(
  userId: number,
  opts: { groupId?: number; courseId?: number } = {}
): Promise<string | null> {
  if (!isEvolmindConfigured()) return null;
  try {
    const data = await apiPostForm("/v1/getUrlAutologin", {
      userid: userId,
      groupid: opts.groupId,
      courseid: opts.courseId,
    });
    return data.urlautologin || null;
  } catch (err) {
    console.error("[evolmind] getUrlAutologin:", err);
    return null;
  }
}
