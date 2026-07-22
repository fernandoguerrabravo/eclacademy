"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, total } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar el pago");
      }
      if (data.url) {
        window.location.href = data.url; // redirige a Stripe Checkout
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={`cart-overlay ${isOpen ? "active" : ""}`}
        onClick={closeCart}
      ></div>
      <div className={`cart-sidebar ${isOpen ? "active" : ""}`}>
        <div className="cart-header">
          <h3>
            <i className="fas fa-shopping-cart"></i> Tu Carrito
          </h3>
          <button
            className="cart-close"
            onClick={closeCart}
            aria-label="Cerrar carrito"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <i className="fas fa-shopping-bag"></i>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-icon">
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <div className="cart-item-info">
                  <h4>{item.title}</h4>
                  <span>${item.price}</span>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Eliminar ${item.title}`}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            {error && (
              <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginBottom: 8 }}>
                {error}
              </p>
            )}
            <div className="cart-total">
              <span>Total:</span>
              <span>${total}</span>
            </div>
            <button
              className="btn-primary btn-lg btn-full"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? "Procesando..." : "Proceder al Pago"}{" "}
              <i className="fas fa-lock"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
