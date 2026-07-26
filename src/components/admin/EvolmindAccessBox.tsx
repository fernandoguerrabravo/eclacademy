"use client";

import { useState } from "react";

/**
 * Caja de "Acceso directo a evolCampus" para el admin.
 * Escribe un email (precargado con el usuario de demo) y abre una sesión
 * autologin en evolCampus como ese usuario en una pestaña nueva.
 */
export function EvolmindAccessBox({
  defaultEmail = "",
}: {
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openAccess() {
    const target = email.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/evolmind-access?email=${encodeURIComponent(target)}`
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo generar el acceso");
      }
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="evol-access-box">
      <div className="evol-access-main">
        <label>
          <i className="fas fa-right-to-bracket"></i> Acceso directo a evolCampus
        </label>
        <div className="evol-access-row">
          <input
            type="email"
            value={email}
            placeholder="email del usuario en evolCampus"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && openAccess()}
          />
          <button
            className="btn-primary btn-sm"
            onClick={openAccess}
            disabled={loading || !email.trim()}
            title="Abrir evolCampus como este usuario (autologin)"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Abriendo...
              </>
            ) : (
              <>
                Entrar como este usuario{" "}
                <i className="fas fa-arrow-up-right-from-square"></i>
              </>
            )}
          </button>
        </div>
        {error && <span className="evol-access-error">{error}</span>}
      </div>
    </div>
  );
}
