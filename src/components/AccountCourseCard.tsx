"use client";

import { useState } from "react";

interface Props {
  enrollmentId: string;
  title: string;
  icon: string;
  synced: boolean;
}

export function AccountCourseCard({ enrollmentId, title, icon, synced }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function goToCourse() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/access`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo abrir el curso");
      }
      // Acceso directo a evolCampus (ya autenticado)
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

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
        {error && <span className="account-course-error">{error}</span>}
      </div>
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
    </div>
  );
}
