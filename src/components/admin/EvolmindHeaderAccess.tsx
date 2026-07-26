"use client";

import { useState } from "react";

/**
 * Botón del header del admin para entrar a evolCampus como el usuario admin
 * (por defecto fernando@gsasellers.com) mediante autologin, en una pestaña nueva.
 * Reutiliza el endpoint /api/admin/evolmind-access.
 */
export function EvolmindHeaderAccess({
  email = "fernando@gsasellers.com",
}: {
  email?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function openAccess() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/evolmind-access?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo generar el acceso");
      }
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "No se pudo abrir evolCampus"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="admin-header-link admin-header-btn"
      onClick={openAccess}
      disabled={loading}
      title={`Abrir evolCampus como ${email} (autologin)`}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin"></i> Abriendo...
        </>
      ) : (
        <>
          <i className="fas fa-right-to-bracket"></i> evolCampus
        </>
      )}
    </button>
  );
}
