"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, total } = useCart();

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
                  onClick={() => removeItem(item.courseId)}
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
            <div className="cart-total">
              <span>Total:</span>
              <span>${total}</span>
            </div>
            <Link
              href="/carrito"
              className="btn-primary btn-lg btn-full"
              onClick={closeCart}
              style={{ textAlign: "center" }}
            >
              Ver carrito y pagar <i className="fas fa-arrow-right"></i>
            </Link>
            <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", textAlign: "center", marginTop: 8 }}>
              Aplica tu cupón de descuento en el siguiente paso
            </p>
          </div>
        )}
      </div>
    </>
  );
}
