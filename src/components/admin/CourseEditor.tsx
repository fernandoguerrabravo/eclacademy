"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPicker } from "@/components/admin/IconPicker";

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
              <label>Icono</label>
              <IconPicker value={c.icon} onChange={(v) => set("icon", v)} />
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

        {c.evolmindCourseId ? (
          <GroupsManager
            evolmindCourseId={c.evolmindCourseId}
            localCourseId={c.id}
            currentGroupId={c.evolmindGroupId}
            onChange={(g) => set("evolmindGroupId", g)}
          />
        ) : (
          <section className="admin-section">
            <h2>Grupos de evolCampus</h2>
            <p className="admin-muted">
              Este curso aún no está enlazado con evolCampus. Sincroniza el
              catálogo primero.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

interface Group {
  id: number;
  name: string;
  status: string;
  numstudents?: number;
  type?: string;
  startdate?: string | null;
  enddate?: string | null;
  duration?: number;
}

function GroupsManager({
  evolmindCourseId,
  localCourseId,
  currentGroupId,
  onChange,
}: {
  evolmindCourseId: number;
  localCourseId: number;
  currentGroupId: number | null;
  onChange: (groupId: number) => void;
}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/evolmind-courses?courseId=${evolmindCourseId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [evolmindCourseId]);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 4000);
  }

  async function useForEnrollment(groupId: number) {
    const res = await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: localCourseId, evolmindGroupId: groupId }),
    });
    if (res.ok) {
      onChange(groupId);
      flash(`Grupo ${groupId} asignado como destino de matrícula.`);
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h2>Grupos en evolCampus</h2>
          <p className="admin-muted">
            Convocatorias del curso. Elige cuál usar para matricular a los compradores.
          </p>
        </div>
        <button className="btn-outline btn-sm" onClick={() => setCreating((v) => !v)}>
          <i className="fas fa-plus"></i> Nuevo grupo
        </button>
      </div>

      {note && <div className="admin-alert success">{note}</div>}
      {error && <div className="admin-alert error">{error}</div>}

      {creating && (
        <GroupCreateForm
          evolmindCourseId={evolmindCourseId}
          localCourseId={localCourseId}
          onCreated={(gid, linked) => {
            setCreating(false);
            if (linked && gid) onChange(gid);
            load();
          }}
        />
      )}

      {loading ? (
        <p>Cargando grupos...</p>
      ) : groups.length === 0 ? (
        <p className="admin-muted">Este curso no tiene grupos activos en evolCampus.</p>
      ) : (
        <div className="group-list">
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              isCurrent={g.id === currentGroupId}
              onUse={() => useForEnrollment(g.id)}
              onUpdated={() => {
                flash(`Grupo ${g.id} actualizado.`);
                load();
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupRow({
  group,
  isCurrent,
  onUse,
  onUpdated,
}: {
  group: Group;
  isCurrent: boolean;
  onUse: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const isAsync = (group.type || "").toUpperCase().startsWith("ASYNC");
  const [name, setName] = useState(group.name);
  const [days, setDays] = useState(group.duration || 30);
  const [startDate, setStartDate] = useState(group.startdate || "");
  const [endDate, setEndDate] = useState(group.enddate || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/evolmind-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          name: name !== group.name ? name : undefined,
          daysDuration: isAsync ? days : undefined,
          startDate: !isAsync ? startDate || undefined : undefined,
          endDate: !isAsync ? endDate || undefined : undefined,
        }),
      });
      if (res.ok) {
        setEditing(false);
        onUpdated();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`group-card ${isCurrent ? "current" : ""}`}>
      <div className="group-card-head">
        <div>
          <strong>{group.name}</strong>{" "}
          <span className="admin-slug">id {group.id}</span>
          {isCurrent && <span className="badge-ok" style={{ marginLeft: 8 }}>Matrícula activa</span>}
        </div>
        <div className="row-actions">
          {!isCurrent && (
            <button className="link-btn" onClick={onUse}>Usar para matrícula</button>
          )}
          <button className="link-btn" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancelar" : "Editar"}
          </button>
        </div>
      </div>
      <div className="group-card-meta">
        <span>{isAsync ? "Asíncrono" : "Síncrono"}</span>
        {isAsync ? (
          <span>{group.duration} días</span>
        ) : (
          <span>{group.startdate} → {group.enddate}</span>
        )}
        <span>{group.numstudents ?? 0} alumnos</span>
        <span>{group.status}</span>
      </div>

      {editing && (
        <div className="group-edit">
          <div className="editor-field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {isAsync ? (
            <div className="editor-field">
              <label>Duración (días)</label>
              <input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          ) : (
            <div className="editor-row">
              <div className="editor-field">
                <label>Inicio</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="editor-field">
                <label>Fin</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
          <button className="btn-primary btn-sm" onClick={save} disabled={busy}>
            {busy ? "Guardando..." : "Guardar grupo"}
          </button>
        </div>
      )}
    </div>
  );
}

function GroupCreateForm({
  evolmindCourseId,
  localCourseId,
  onCreated,
}: {
  evolmindCourseId: number;
  localCourseId: number;
  onCreated: (groupId: number | null, linked: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"A" | "S">("A");
  const [daysDuration, setDaysDuration] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkIt, setLinkIt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
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
      onCreated(data.groupId ?? null, Boolean(data.linkedCourse));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="group-edit" style={{ marginBottom: 16 }}>
      {error && <div className="admin-alert error">{error}</div>}
      <div className="editor-field">
        <label>Nombre del grupo</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Convocatoria Marzo 2026" />
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
      <label className="admin-switch" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={linkIt} onChange={(e) => setLinkIt(e.target.checked)} />
        <span>Usar este grupo como destino de matrícula</span>
      </label>
      <button className="btn-primary btn-sm" onClick={create} disabled={busy || !name}>
        {busy ? "Creando..." : "Crear grupo"}
      </button>
    </div>
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
