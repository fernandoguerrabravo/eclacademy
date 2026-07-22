"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FullCourse {
  id: number;
  slug: string;
  title: string;
  category: string;
  icon: string;
  shortDescription: string;
  description: string;
  badge: string | null;
  price: number;
  originalPrice: number;
  weeks: number;
  lessons: number;
  whatYouLearn: string[];
  requirements: string[];
  audience: string[];
  published: boolean;
  active: boolean;
  evolmindCourseId: number | null;
  evolmindGroupId: number | null;
}

export function CourseEditor({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [c, setC] = useState<FullCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/courses/${courseId}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setC(data.course);
    setLoading(false);
  }, [courseId, router]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof FullCourse>(key: K, value: FullCourse[K]) {
    setC((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!c) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: c.id,
          title: c.title,
          category: c.category,
          icon: c.icon,
          badge: c.badge || null,
          shortDescription: c.shortDescription,
          description: c.description,
          price: c.price,
          originalPrice: c.originalPrice,
          weeks: c.weeks,
          lessons: c.lessons,
          whatYouLearn: c.whatYouLearn,
          requirements: c.requirements,
          audience: c.audience,
          published: c.published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setMsg("Cambios guardados.");
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-page">Cargando...</div>;
  if (!c) return <div className="admin-page">Curso no encontrado.</div>;

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back">
            <i className="fas fa-arrow-left"></i>
          </Link>{" "}
          Editar curso
        </h1>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {msg && <div className="admin-alert success">{msg}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      <div className="editor-grid">
        <section className="admin-section">
          <h2>Información</h2>
          <div className="editor-field">
            <label>Título</label>
            <input value={c.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="editor-row">
            <div className="editor-field">
              <label>Categoría</label>
              <input value={c.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="editor-field">
              <label>Icono (Font Awesome)</label>
              <input value={c.icon} onChange={(e) => set("icon", e.target.value)} placeholder="fa-graduation-cap" />
            </div>
            <div className="editor-field">
              <label>Badge</label>
              <select
                value={c.badge || ""}
                onChange={(e) => set("badge", e.target.value || null)}
              >
                <option value="">Ninguno</option>
                <option value="bestseller">Más Vendido</option>
                <option value="new">Nuevo</option>
                <option value="popular">Popular</option>
              </select>
            </div>
          </div>
          <div className="editor-field">
            <label>Descripción corta (tarjeta)</label>
            <textarea
              rows={2}
              value={c.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          </div>
          <div className="editor-field">
            <label>Descripción completa</label>
            <textarea
              rows={5}
              value={c.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </section>

        <section className="admin-section">
          <h2>Precio y publicación</h2>
          <div className="editor-row">
            <div className="editor-field">
              <label>Precio ($)</label>
              <input type="number" value={c.price} min={0} onChange={(e) => set("price", Number(e.target.value))} />
            </div>
            <div className="editor-field">
              <label>Precio anterior ($)</label>
              <input type="number" value={c.originalPrice} min={0} onChange={(e) => set("originalPrice", Number(e.target.value))} />
            </div>
          </div>
          <div className="editor-row">
            <div className="editor-field">
              <label>Semanas</label>
              <input type="number" value={c.weeks} min={0} onChange={(e) => set("weeks", Number(e.target.value))} />
            </div>
            <div className="editor-field">
              <label>Lecciones</label>
              <input type="number" value={c.lessons} min={0} onChange={(e) => set("lessons", Number(e.target.value))} />
            </div>
          </div>
          <label className="admin-switch" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={c.published}
              disabled={!c.evolmindGroupId}
              onChange={(e) => set("published", e.target.checked)}
            />
            <span>{c.published ? "Publicado en la tienda" : "Oculto"}</span>
          </label>
          {!c.evolmindGroupId && (
            <p className="admin-muted" style={{ marginTop: 8 }}>
              Este curso no está enlazado con un grupo de evolCampus. Sincroniza
              primero para poder publicarlo.
            </p>
          )}
          <p className="admin-muted" style={{ marginTop: 8 }}>
            evolCampus: curso {c.evolmindCourseId ?? "—"} / grupo{" "}
            {c.evolmindGroupId ?? "—"}
          </p>
        </section>

        <section className="admin-section">
          <h2>Lo que aprenderás</h2>
          <p className="admin-muted">Una línea por punto.</p>
          <ListEditor value={c.whatYouLearn} onChange={(v) => set("whatYouLearn", v)} />
        </section>

        <section className="admin-section">
          <h2>Requisitos</h2>
          <p className="admin-muted">Una línea por requisito.</p>
          <ListEditor value={c.requirements} onChange={(v) => set("requirements", v)} />
        </section>

        <section className="admin-section">
          <h2>¿Para quién es?</h2>
          <p className="admin-muted">Una línea por perfil.</p>
          <ListEditor value={c.audience} onChange={(v) => set("audience", v)} />
        </section>

        {c.evolmindGroupId && <GroupEditor groupId={c.evolmindGroupId} />}

        {c.evolmindCourseId && (
          <GroupCreator
            evolmindCourseId={c.evolmindCourseId}
            localCourseId={c.id}
            onLinked={(groupId) => set("evolmindGroupId", groupId)}
          />
        )}
      </div>
    </div>
  );
}

function GroupEditor({ groupId }: { groupId: number }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"A" | "S">("A");
  const [daysDuration, setDaysDuration] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/evolmind-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          name: name || undefined,
          daysDuration: type === "A" && daysDuration ? daysDuration : undefined,
          startDate: type === "S" ? startDate || undefined : undefined,
          endDate: type === "S" ? endDate || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNote("Grupo actualizado en evolCampus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Grupo de matrícula (id {groupId})</h2>
      <p className="admin-muted">
        Modifica el grupo actual en evolCampus. Deja en blanco lo que no quieras cambiar.
      </p>
      {note && <div className="admin-alert success" style={{ marginTop: 12 }}>{note}</div>}
      {error && <div className="admin-alert error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="editor-field">
        <label>Nuevo nombre (opcional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dejar en blanco para no cambiar" />
      </div>
      <div className="editor-row">
        <div className="editor-field">
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as "A" | "S")}>
            <option value="A">Asíncrono</option>
            <option value="S">Síncrono</option>
          </select>
        </div>
        {type === "A" ? (
          <div className="editor-field">
            <label>Duración (días)</label>
            <input type="number" min={1} value={daysDuration} onChange={(e) => setDaysDuration(Number(e.target.value))} />
          </div>
        ) : (
          <>
            <div className="editor-field">
              <label>Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="editor-field">
              <label>Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <button className="btn-primary btn-sm" onClick={save} disabled={busy}>
        {busy ? "Guardando..." : "Actualizar grupo"}
      </button>
    </section>
  );
}

function GroupCreator({
  evolmindCourseId,
  localCourseId,
  onLinked,
}: {
  evolmindCourseId: number;
  localCourseId: number;
  onLinked: (groupId: number) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"A" | "S">("A");
  const [daysDuration, setDaysDuration] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkIt, setLinkIt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/evolmind-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evolmindCourseId,
          name,
          type,
          daysDuration: type === "A" ? daysDuration : undefined,
          startDate: type === "S" ? startDate : undefined,
          endDate: type === "S" ? endDate : undefined,
          linkToCourseId: linkIt ? localCourseId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setResult(
        `Grupo creado en evolCampus (id ${data.groupId})${
          data.linkedCourse ? " y enlazado como grupo de matrícula." : "."
        }`
      );
      if (data.linkedCourse && data.groupId) onLinked(data.groupId);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Crear grupo en evolCampus</h2>
      <p className="admin-muted">
        Crea una nueva convocatoria (grupo) para este curso en evolCampus.
      </p>
      {result && <div className="admin-alert success" style={{ marginTop: 12 }}>{result}</div>}
      {error && <div className="admin-alert error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="editor-field">
        <label>Nombre del grupo</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Convocatoria Marzo 2026" />
      </div>
      <div className="editor-row">
        <div className="editor-field">
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as "A" | "S")}>
            <option value="A">Asíncrono (cada alumno a su ritmo)</option>
            <option value="S">Síncrono (fechas fijas)</option>
          </select>
        </div>
        {type === "A" ? (
          <div className="editor-field">
            <label>Duración (días)</label>
            <input type="number" min={1} value={daysDuration} onChange={(e) => setDaysDuration(Number(e.target.value))} />
          </div>
        ) : (
          <>
            <div className="editor-field">
              <label>Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="editor-field">
              <label>Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <label className="admin-switch" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={linkIt} onChange={(e) => setLinkIt(e.target.checked)} />
        <span>Usar este grupo como destino de matrícula de este curso</span>
      </label>
      <div>
        <button className="btn-primary btn-sm" onClick={create} disabled={busy || !name}>
          {busy ? "Creando..." : "Crear grupo"}
        </button>
      </div>
    </section>
  );
}

function ListEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <textarea
      rows={5}
      value={value.join("\n")}
      onChange={(e) =>
        onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))
      }
      className="editor-textarea"
    />
  );
}
