"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Token inválido");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="fas fa-lock"></i>
          <span>ECL <strong>Admin</strong></span>
        </div>
        <h1>Panel de administración</h1>
        <p className="auth-sub">Introduce el token de administrador</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Admin token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
