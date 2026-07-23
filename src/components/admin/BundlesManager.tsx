"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AdminBundle {
  id: number;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: string;
  price: number;
  originalPrice: number;
  published: boolean;
  courseIds: number[];
  courseTitles: string[];
}

interface CourseOption {
  id: number;
  title: string;
  evolmindGroupId: number | null;
}

export function BundlesManager() {
  const router = useRouter();
  const [bundles, setBundles] = useState<AdminBundle[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminBundle | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rb, rc] = await Promise.all([
      fetch("/api/admin/bundles"),
      fetch("/api/admin/courses"),
    ]);
    if (rb.status === 401) {
      router.push("/admin/login");
      return;
    }
    const db = await rb.json();
    const dc = await rc.json();
    setBundles(db.bundles || []);
    setCourses(dc.courses || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string, isErr = false) {
    if (isErr) setError(m);
    else setMsg(m);
    setTimeout(() => {
      setMsg(null);
      setError(null);
    }, 4000);
  }

  async function togglePublish(b: AdminBundle) {
    const res = await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, published: !b.published }),
    });
    const data = await res.json();
    if (!res.ok) return flash(data.error || "Error", true);
    flash(b.published ? "Paquete ocultado" : "Paquete publicado");
    load();
  }

  async function remove(b: AdminBundle) {
    if (!confirm(`¿Eliminar el paquete "${b.title}"?`)) return;
    await fetch(`/api/admin/bundles?id=${b.id}`, { method: "DELETE" });
    flash("Paquete eliminado");
    load();
  }

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back"><i className="fas fa-arrow-left"></i></Link>{" "}
          Paquetes
        </h1>
        <button className="btn-primary btn-sm" onClick={() => { setCreating(true); setEditing(null); }}>
          <i className="fas fa-plus"></i> Nuevo paquete
        </button>
      </div>

      {msg && <div className="admin-alert success">{msg}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      {(creating || editing) && (
        <BundleForm
          bundle={editing}
          courses={courses}
          onCancel={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); flash("Guardado"); load(); }}
          onError={(m) => flash(m, true)}
        />
      )}

      <section className="admin-section">
        {loading ? (
          <p>Cargando...</p>
        ) : bundles.length === 0 ? (
          <p className="admin-muted">No hay paquetes. Crea el primero.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Paquete</th><th>Cursos</th><th>Precio</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {bundles.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.title}</strong><div className="admin-slug">/{b.slug}</div></td>
                    <td>{b.courseTitles.length} · <span className="admin-muted">{b.courseTitles.join(", ").slice(0, 40)}</span></td>
                    <td><strong>${b.price}</strong> {b.originalPrice > b.price && <span className="price-old">${b.originalPrice}</span>}</td>
                    <td>
                      <label className="admin-switch">
                        <input type="checkbox" checked={b.published} onChange={() => togglePublish(b)} />
                        <span>{b.published ? "Publicado" : "Oculto"}</span>
                      </label>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="link-btn" onClick={() => { setEditing(b); setCreating(false); }}>Editar</button>
                        <button className="link-btn" onClick={() => remove(b)} style={{ color: "#b91c1c" }}>Eliminar</button>
                      </div>
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

function BundleForm({
  bundle,
  courses,
  onCancel,
  onSaved,
  onError,
}: {
  bundle: AdminBundle | null;
  courses: CourseOption[];
  onCancel: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState(bundle?.title || "");
  const [slug, setSlug] = useState(bundle?.slug || "");
  const [shortDescription, setShort] = useState(bundle?.shortDescription || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [price, setPrice] = useState(bundle?.price || 0);
  const [originalPrice, setOriginalPrice] = useState(bundle?.originalPrice || 0);
  const [courseIds, setCourseIds] = useState<number[]>(bundle?.courseIds || []);
  const [busy, setBusy] = useState(false);

  function toggleCourse(id: number) {
    setCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save() {
    setBusy(true);
    try {
      const payload = { title, slug, shortDescription, description, price, originalPrice, courseIds };
      const res = await fetch("/api/admin/bundles", {
        method: bundle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle ? { id: bundle.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>{bundle ? "Editar paquete" : "Nuevo paquete"}</h2>
      <div className="editor-field">
        <label>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="editor-field">
        <label>Slug (URL)</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="programa-completo" />
      </div>
      <div className="editor-field">
        <label>Descripción corta</label>
        <input value={shortDescription} onChange={(e) => setShort(e.target.value)} />
      </div>
      <div className="editor-field">
        <label>Descripción</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="editor-row">
        <div className="editor-field">
          <label>Precio ($)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div className="editor-field">
          <label>Precio anterior ($)</label>
          <input type="number" min={0} value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} />
        </div>
      </div>
      <div className="editor-field">
        <label>Cursos incluidos</label>
        <div className="bundle-course-picker">
          {courses.map((c) => (
            <label key={c.id} className={`bundle-pick ${courseIds.includes(c.id) ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={courseIds.includes(c.id)}
                onChange={() => toggleCourse(c.id)}
                disabled={!c.evolmindGroupId}
              />
              <span>{c.title}</span>
              {!c.evolmindGroupId && <em className="admin-muted"> (no enlazado)</em>}
            </label>
          ))}
          {courses.length === 0 && <p className="admin-muted">No hay cursos. Sincroniza primero.</p>}
        </div>
      </div>
      <div className="row-actions">
        <button className="btn-primary btn-sm" onClick={save} disabled={busy || !title || !slug}>
          {busy ? "Guardando..." : "Guardar paquete"}
        </button>
        <button className="btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </section>
  );
}
