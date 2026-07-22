"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { Footer } from "@/components/Footer";

export default function CartPage() {
  const { items, removeItem, total } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => i.courseId) }),
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
                <span>${total}</span>
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
