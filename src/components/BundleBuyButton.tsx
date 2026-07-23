"use client";

import { useState } from "react";

export function BundleBuyButton({ bundleId }: { bundleId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Error");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <>
      <button className="btn-enroll" onClick={buy} disabled={loading}>
        <i className="fas fa-bolt"></i>{" "}
        {loading ? "Procesando..." : "Comprar paquete"}
      </button>
      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: 8 }}>{error}</p>
      )}
    </>
  );
}
