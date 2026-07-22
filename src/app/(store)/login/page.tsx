"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("No se pudo enviar el enlace. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="fas fa-graduation-cap"></i>
          <span>ECL <strong>Academy</strong></span>
        </div>

        {sent ? (
          <div className="auth-magic-sent">
            <i className="fas fa-envelope-circle-check"></i>
            <p>
              Si existe una cuenta con <strong>{email}</strong>, te enviamos un
              enlace de acceso. Revisa tu correo (y la carpeta de spam).
            </p>
          </div>
        ) : (
          <>
            <h1>Accede a tus cursos</h1>
            <p className="auth-sub">
              Te enviamos un enlace de acceso a tu correo. Sin contraseñas.
            </p>
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <div className="form-group">
                <label>Tu email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-primary btn-lg btn-full"
                disabled={loading}
              >
                <i className="fas fa-envelope"></i>{" "}
                {loading ? "Enviando..." : "Enviarme el enlace de acceso"}
              </button>
            </form>

            <p className="auth-switch">
              ¿Aún no tienes cursos?{" "}
              <Link href="/#cursos">Explora el catálogo</Link>
            </p>
            <p className="auth-note">
              Tu cuenta se crea automáticamente al inscribirte en un curso.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
