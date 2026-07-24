"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Footer } from "@/components/Footer";

export default function CartPage() {
  const { items, removeItem, total } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cupón de descuento
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(0);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const discounted = Math.max(0, Math.round(total * (1 - percent / 100)));

  async function applyCode() {
    if (!code.trim()) return;
    setValidating(true);
    setCodeError(null);
    setCodeMsg(null);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setPercent(data.percent);
        setCodeMsg(`Cupón aplicado: -${data.percent}%`);
      } else {
        setPercent(0);
        setCodeError(data.reason || "Código no válido");
      }
    } finally {
      setValidating(false);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => i.courseId),
          code: percent > 0 ? code : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al iniciar el pago");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="container" style={{ padding: "48px 24px", minHeight: "60vh" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 24 }}>
          Carrito de Compras
        </h1>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <i
              className="fas fa-shopping-bag"
              style={{ fontSize: "3rem", color: "var(--gray-300)", marginBottom: 16 }}
            ></i>
            <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
              Tu carrito está vacío
            </p>
            <Link href="/#cursos" className="btn-primary btn-lg">
              Explorar cursos
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 32,
              alignItems: "start",
            }}
          >
            <div>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: 16,
                    border: "1px solid var(--gray-200)",
                    borderRadius: 8,
                    marginBottom: 12,
                    alignItems: "center",
                  }}
                >
                  <div className="cart-item-icon">
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: "0.95rem" }}>{item.title}</h4>
                    <span style={{ fontWeight: 700 }}>${item.price}</span>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => removeItem(item.courseId)}
                  >
                    <i className="fas fa-trash"></i> Quitar
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                border: "1px solid var(--gray-200)",
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h3 style={{ marginBottom: 16 }}>Resumen</h3>

              {/* Cupón de descuento */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: 6 }}>
                  ¿Tienes un cupón?
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setPercent(0); setCodeMsg(null); setCodeError(null); }}
                    placeholder="ECL-XXXXXX"
                    style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--gray-300)", borderRadius: 6, fontSize: "0.9rem", fontFamily: "monospace" }}
                  />
                  <button className="btn-outline btn-sm" onClick={applyCode} disabled={validating || !code.trim()}>
                    {validating ? "..." : "Aplicar"}
                  </button>
                </div>
                {codeMsg && <p style={{ color: "#166534", fontSize: "0.8rem", marginTop: 6 }}>{codeMsg}</p>}
                {codeError && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: 6 }}>{codeError}</p>}
              </div>

              {percent > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--gray-500)", marginBottom: 6 }}>
                  <span>Subtotal:</span>
                  <span style={{ textDecoration: "line-through" }}>${total}</span>
                </div>
              )}
              {percent > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#166534", marginBottom: 6 }}>
                  <span>Descuento ({percent}%):</span>
                  <span>-${total - discounted}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  marginBottom: 16,
                }}
              >
                <span>Total:</span>
                <span>${discounted}</span>
              </div>
              {error && (
                <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginBottom: 8 }}>
                  {error}
                </p>
              )}
              <button
                className="btn-primary btn-lg btn-full"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? "Procesando..." : "Proceder al Pago"}{" "}
                <i className="fas fa-lock"></i>
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
