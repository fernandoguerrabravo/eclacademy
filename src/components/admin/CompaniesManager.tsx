"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Company {
  id: number;
  name: string;
  documentId: string | null;
  contactEmail: string | null;
  evolmindCompanyId: number | null;
  students: number;
}

interface CourseOption {
  id: number;
  title: string;
  evolmindGroupId: number | null;
}

export function CompaniesManager() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [enrollFor, setEnrollFor] = useState<Company | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rc, rco] = await Promise.all([
      fetch("/api/admin/companies"),
      fetch("/api/admin/courses"),
    ]);
    if (rc.status === 401) {
      router.push("/admin/login");
      return;
    }
    setCompanies((await rc.json()).companies || []);
    setCourses((await rco.json()).courses || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string, isErr = false) {
    if (isErr) setError(m);
    else setMsg(m);
    setTimeout(() => { setMsg(null); setError(null); }, 5000);
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back"><i className="fas fa-arrow-left"></i></Link>{" "}
          Empresas (B2B)
        </h1>
        <button className="btn-primary btn-sm" onClick={() => setCreating((v) => !v)}>
          <i className="fas fa-plus"></i> Nueva empresa
        </button>
      </div>

      {msg && <div className="admin-alert success">{msg}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      {creating && (
        <CompanyForm
          onCancel={() => setCreating(false)}
          onSaved={(note) => { setCreating(false); flash(note); load(); }}
          onError={(m) => flash(m, true)}
        />
      )}

      {enrollFor && (
        <BulkEnrollForm
          company={enrollFor}
          courses={courses}
          onClose={() => setEnrollFor(null)}
          onDone={(m) => { setEnrollFor(null); flash(m); load(); }}
          onError={(m) => flash(m, true)}
        />
      )}

      <section className="admin-section">
        {loading ? (
          <p>Cargando...</p>
        ) : companies.length === 0 ? (
          <p className="admin-muted">No hay empresas. Crea la primera.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Empresa</th><th>Documento</th><th>evolCampus</th><th>Alumnos</th><th></th></tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong>{c.contactEmail && <div className="admin-slug">{c.contactEmail}</div>}</td>
                    <td>{c.documentId || "—"}</td>
                    <td>
                      {c.evolmindCompanyId ? (
                        <span className="badge-ok"><i className="fas fa-check"></i> {c.evolmindCompanyId}</span>
                      ) : (
                        <span className="badge-warn">sin vincular</span>
                      )}
                    </td>
                    <td>{c.students}</td>
                    <td>
                      <button className="link-btn" onClick={() => setEnrollFor(c)}>Matricular empleados</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CompanyForm({
  onCancel,
  onSaved,
  onError,
}: {
  onCancel: () => void;
  onSaved: (note: string) => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, documentId, contactEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onSaved(data.note || "Empresa creada");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Nueva empresa</h2>
      <div className="editor-row">
        <div className="editor-field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Documento (NIF/RUC/CIF)</label>
          <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
        </div>
        <div className="editor-field">
          <label>Email de contacto</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
      </div>
      <div className="row-actions">
        <button className="btn-primary btn-sm" onClick={save} disabled={busy || !name}>
          {busy ? "Creando..." : "Crear empresa"}
        </button>
        <button className="btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </section>
  );
}

function BulkEnrollForm({
  company,
  courses,
  onClose,
  onDone,
  onError,
}: {
  company: Company;
  courses: CourseOption[];
  onClose: () => void;
  onDone: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [courseId, setCourseId] = useState<number | "">("");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const linkable = courses.filter((c) => c.evolmindGroupId);

  async function enroll() {
    if (!courseId) return onError("Elige un curso");
    // Parsea líneas: "email" o "email, Nombre"
    const students = emails
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [email, ...rest] = l.split(",").map((x) => x.trim());
        return { email, name: rest.join(" ") || undefined };
      });
    if (students.length === 0) return onError("Añade al menos un email");

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, students }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onDone(`Matriculados ${data.enrolled}/${data.total}${data.failed ? `, ${data.failed} con error` : ""}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Matricular empleados · {company.name}</h2>
      <div className="editor-field">
        <label>Curso</label>
        <select value={courseId} onChange={(e) => setCourseId(Number(e.target.value) || "")}>
          <option value="">Selecciona un curso</option>
          {linkable.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>
      <div className="editor-field">
        <label>Empleados (uno por línea: email o "email, Nombre Apellido")</label>
        <textarea
          rows={6}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder={"juan@empresa.com, Juan Pérez\nmaria@empresa.com, María López"}
        />
      </div>
      <div className="row-actions">
        <button className="btn-primary btn-sm" onClick={enroll} disabled={busy}>
          {busy ? "Matriculando..." : "Matricular"}
        </button>
        <button className="btn-outline btn-sm" onClick={onClose}>Cerrar</button>
      </div>
    </section>
  );
}
