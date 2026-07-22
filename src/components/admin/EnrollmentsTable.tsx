"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AdminEnrollment {
  id: string;
  email: string;
  name: string | null;
  course: string;
  courseSlug: string;
  status: string;
  registered: boolean;
  evolmindSynced: boolean;
  evolmindEnrollmentId: string | null;
  evolmindUserId: number | null;
  evolmindError: string | null;
  orderId: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  synced: number;
  pending: number;
}

export function EnrollmentsTable() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminEnrollment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, synced: 0, pending: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"" | "true" | "false">("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter) params.set("synced", filter);
    const res = await fetch(`/api/admin/enrollments?${params.toString()}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setRows(data.enrollments || []);
    setStats(data.stats || { total: 0, synced: 0, pending: 0 });
    setLoading(false);
  }, [search, filter, router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <h1>
          <Link href="/admin" className="admin-back">
            <i className="fas fa-arrow-left"></i>
          </Link>{" "}
          Matrículas
        </h1>
      </div>

      <div className="admin-stats">
        <div className="stat-box">
          <span className="stat-box-num">{stats.total}</span>
          <span className="stat-box-label">Total</span>
        </div>
        <div className="stat-box ok">
          <span className="stat-box-num">{stats.synced}</span>
          <span className="stat-box-label">Sincronizadas</span>
        </div>
        <div className="stat-box warn">
          <span className="stat-box-num">{stats.pending}</span>
          <span className="stat-box-label">Pendientes</span>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <div className="enroll-filters">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="">Todas</option>
              <option value="true">Sincronizadas</option>
              <option value="false">Pendientes</option>
            </select>
            <button className="btn-outline btn-sm" onClick={load}>
              Filtrar
            </button>
          </div>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : rows.length === 0 ? (
          <p className="admin-muted">No hay matrículas.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Tipo</th>
                  <th>evolCampus</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <EnrollmentRow key={e.id} e={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EnrollmentRow({ e }: { e: AdminEnrollment }) {
  const [progress, setProgress] = useState<{ completedPercent: number; grade: number } | null>(null);
  const [loadingP, setLoadingP] = useState(false);
  const [extending, setExtending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function loadProgress() {
    setLoadingP(true);
    try {
      const res = await fetch(`/api/admin/enrollments/${e.id}`);
      const data = await res.json();
      setProgress(data.progress);
    } finally {
      setLoadingP(false);
    }
  }

  async function extend() {
    const input = prompt("¿Cuántos días ampliar el acceso?", "30");
    if (!input) return;
    const days = Number(input);
    if (!days || days <= 0) return;
    setExtending(true);
    setNote(null);
    try {
      const res = await fetch(`/api/admin/enrollments/${e.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      setNote(res.ok ? `Ampliado ${days} días` : data.error || "Error");
    } finally {
      setExtending(false);
    }
  }

  return (
    <tr>
      <td>
        <strong>{e.name || "—"}</strong>
        <div className="admin-slug">{e.email}</div>
      </td>
      <td>{e.course}</td>
      <td>
        {e.evolmindSynced ? (
          <span className="badge-ok">
            <i className="fas fa-check"></i> {e.evolmindEnrollmentId}
          </span>
        ) : (
          <span className="badge-warn" title={e.evolmindError || ""}>
            <i className="fas fa-clock"></i> pendiente
          </span>
        )}
      </td>
      <td>
        {progress ? (
          <span>
            {Math.round(progress.completedPercent)}%
            {progress.grade > 0 ? ` · ${progress.grade}` : ""}
          </span>
        ) : e.evolmindSynced ? (
          <button className="link-btn" onClick={loadProgress} disabled={loadingP}>
            {loadingP ? "..." : "Ver"}
          </button>
        ) : (
          <span className="admin-muted">—</span>
        )}
      </td>
      <td>
        <span className={`status-pill status-${e.status}`}>{e.status}</span>
      </td>
      <td>
        {e.evolmindSynced && (
          <button className="link-btn" onClick={extend} disabled={extending}>
            {extending ? "..." : note || "Ampliar"}
          </button>
        )}
      </td>
    </tr>
  );
}
