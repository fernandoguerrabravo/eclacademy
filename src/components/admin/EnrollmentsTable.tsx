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
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name || "—"}</strong>
                      <div className="admin-slug">{e.email}</div>
                    </td>
                    <td>{e.course}</td>
                    <td>
                      {e.registered ? (
                        <span className="badge-ok"><i className="fas fa-user"></i> Cuenta</span>
                      ) : (
                        <span className="badge-warn"><i className="fas fa-user-clock"></i> Invitado</span>
                      )}
                    </td>
                    <td>
                      {e.evolmindSynced ? (
                        <span className="badge-ok">
                          <i className="fas fa-check"></i> matrícula {e.evolmindEnrollmentId}
                        </span>
                      ) : (
                        <span className="badge-warn" title={e.evolmindError || ""}>
                          <i className="fas fa-clock"></i> pendiente
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${e.status}`}>{e.status}</span>
                    </td>
                    <td>{new Date(e.createdAt).toLocaleDateString("es")}</td>
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
