"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminCourse {
  id: number;
  slug: string;
  title: string;
  price: number;
  originalPrice: number;
  published: boolean;
  active: boolean;
  evolmindCourseId: number | null;
  evolmindGroupId: number | null;
  evolmindSynced: boolean;
  evolmindError: string | null;
}

export function AdminDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      setCourses(data.courses || []);
    } catch {
      setError("No se pudieron cargar los cursos");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  function flash(msg: string, isError = false) {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 4000);
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/courses", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al sincronizar");
      flash(
        `Sincronizado: ${data.created} creados, ${data.updated} actualizados, ${data.deactivated} desactivados.`
      );
      await loadCourses();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Error", true);
    } finally {
      setSyncing(false);
    }
  }

  async function handleRetryEnrollments() {
    try {
      const res = await fetch("/api/admin/sync-enrollments", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      flash(
        `Matrículas: ${data.synced}/${data.processed} sincronizadas${
          data.failed ? `, ${data.failed} con error` : ""
        }.`
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Error", true);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1><i className="fas fa-gauge-high"></i> Administración</h1>
        <button className="btn-outline btn-sm" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      {message && <div className="admin-alert success">{message}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      <section className="admin-section">
        <div className="admin-section-head">
          <div>
            <h2>Catálogo de cursos</h2>
            <p>evolCampus es la fuente de verdad. Sincroniza y luego fija precio y publica.</p>
          </div>
          <div className="admin-actions">
            <button className="btn-outline btn-sm" onClick={handleRetryEnrollments}>
              <i className="fas fa-rotate"></i> Reintentar matrículas
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <i className="fas fa-cloud-arrow-down"></i>{" "}
              {syncing ? "Sincronizando..." : "Sincronizar desde evolCampus"}
            </button>
          </div>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : courses.length === 0 ? (
          <p className="admin-muted">
            No hay cursos. Pulsa "Sincronizar desde evolCampus".
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>evolCampus</th>
                  <th>Precio</th>
                  <th>Antes</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <CourseRow key={c.id} course={c} onSaved={loadCourses} onFlash={flash} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CourseRow({
  course,
  onSaved,
  onFlash,
}: {
  course: AdminCourse;
  onSaved: () => void;
  onFlash: (msg: string, isError?: boolean) => void;
}) {
  const [price, setPrice] = useState(course.price);
  const [originalPrice, setOriginalPrice] = useState(course.originalPrice);
  const [published, setPublished] = useState(course.published);
  const [saving, setSaving] = useState(false);

  const dirty =
    price !== course.price ||
    originalPrice !== course.originalPrice ||
    published !== course.published;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          price,
          originalPrice,
          published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      onFlash(`"${course.title}" guardado.`);
      onSaved();
    } catch (err) {
      onFlash(err instanceof Error ? err.message : "Error", true);
      // revierte el toggle si falló la publicación
      setPublished(course.published);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={course.active ? "" : "row-inactive"}>
      <td>
        <strong>{course.title}</strong>
        <div className="admin-slug">/{course.slug}</div>
      </td>
      <td>
        {course.evolmindGroupId ? (
          <span className="badge-ok">
            <i className="fas fa-check"></i> curso {course.evolmindCourseId} / grupo {course.evolmindGroupId}
          </span>
        ) : (
          <span className="badge-warn" title={course.evolmindError || ""}>
            <i className="fas fa-triangle-exclamation"></i> sin enlazar
          </span>
        )}
      </td>
      <td>
        <div className="input-money">
          <span>$</span>
          <input
            type="number"
            value={price}
            min={0}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
      </td>
      <td>
        <div className="input-money">
          <span>$</span>
          <input
            type="number"
            value={originalPrice}
            min={0}
            onChange={(e) => setOriginalPrice(Number(e.target.value))}
          />
        </div>
      </td>
      <td>
        <label className="admin-switch">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            disabled={!course.evolmindGroupId}
          />
          <span>{published ? "Publicado" : "Oculto"}</span>
        </label>
      </td>
      <td>
        <button
          className="btn-primary btn-sm"
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? "..." : "Guardar"}
        </button>
      </td>
    </tr>
  );
}
