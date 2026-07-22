"use client";

import { useEffect, useState } from "react";

interface Props {
  enrollmentId: string;
  title: string;
  icon: string;
  synced: boolean;
}

interface Progress {
  completedPercent: number;
  grade: number;
  status: number;
  lastConnect: string | null;
  diplomaUrl: string | null;
}

export function AccountCourseCard({ enrollmentId, title, icon, synced }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (!synced) return;
    fetch(`/api/enrollments/${enrollmentId}/progress`)
      .then((r) => r.json())
      .then((d) => setProgress(d.progress))
      .catch(() => {});
  }, [enrollmentId, synced]);

  async function goToCourse() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/access`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo abrir el curso");
      }
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const pct = progress ? Math.round(progress.completedPercent) : null;

  return (
    <div className="account-course-card">
      <div className="account-course-icon">
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="account-course-info">
        <h3>{title}</h3>
        {synced ? (
          <span className="account-course-status">
            <i className="fas fa-circle-check"></i> Matrícula activa
          </span>
        ) : (
          <span className="account-course-status pending">
            <i className="fas fa-clock"></i> Preparando tu acceso...
          </span>
        )}

        {pct !== null && (
          <div className="course-progress">
            <div className="course-progress-bar">
              <span style={{ width: `${pct}%` }}></span>
            </div>
            <div className="course-progress-meta">
              <span>{pct}% completado</span>
              {progress!.grade > 0 && <span>Nota: {progress!.grade}</span>}
            </div>
          </div>
        )}

        {error && <span className="account-course-error">{error}</span>}
      </div>

      <div className="account-course-actions">
        <button
          className="btn-primary btn-sm"
          onClick={goToCourse}
          disabled={!synced || loading}
          title={synced ? "Entrar al curso en evolCampus" : "Tu acceso se está preparando"}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Abriendo...
            </>
          ) : (
            <>
              Ir al curso <i className="fas fa-arrow-up-right-from-square"></i>
            </>
          )}
        </button>
        {progress?.diplomaUrl && (
          <a
            className="btn-outline btn-sm"
            href={progress.diplomaUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="fas fa-award"></i> Certificado
          </a>
        )}
      </div>
    </div>
  );
}
