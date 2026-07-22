"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function Navbar() {
  const { count, openCart } = useCart();

  return (
    <>
      <div className="top-banner">
        <p>
          <strong>Nuevos cursos disponibles</strong> — Aprende a vender en
          Amazon USA desde Latinoamérica. Cursos desde <strong>$147</strong> |{" "}
          <Link href="/#cursos">Ver cursos</Link>
        </p>
      </div>

      <nav className="navbar" id="navbar">
        <div className="container nav-container">
          <div className="nav-left">
            <Link href="/" className="logo">
              <i className="fas fa-graduation-cap"></i>
              <span>
                ECL <strong>Academy</strong>
              </span>
            </Link>
            <div className="nav-categories">
              <button className="categories-btn">
                Categorías <i className="fas fa-chevron-down"></i>
              </button>
              <div className="categories-dropdown">
                <Link href="/cursos/cumplimiento-aduanero">
                  <i className="fas fa-ship"></i> Cumplimiento Aduanero
                </Link>
                <Link href="/cursos/regulaciones-fda">
                  <i className="fas fa-flask"></i> Regulaciones FDA
                </Link>
                <Link href="/cursos/cumplimiento-usda">
                  <i className="fas fa-seedling"></i> Cumplimiento USDA
                </Link>
                <Link href="/cursos/logistica-internacional-fba">
                  <i className="fas fa-truck-fast"></i> Logística Internacional
                </Link>
                <Link href="/cursos/gestion-fintech">
                  <i className="fas fa-coins"></i> Gestión Fintech
                </Link>
                <Link href="/cursos/tratados-libre-comercio">
                  <i className="fas fa-file-contract"></i> Tratados de Libre
                  Comercio
                </Link>
              </div>
            </div>
          </div>
          <div className="nav-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar cursos de comercio internacional..."
              aria-label="Buscar cursos"
            />
          </div>
          <div className="nav-right">
            <Link href="/#cursos" className="nav-link">
              Cursos
            </Link>
            <Link href="/#nosotros" className="nav-link">
              Nosotros
            </Link>
            <button
              className="btn-cart"
              onClick={openCart}
              aria-label="Carrito de compras"
            >
              <i className="fas fa-shopping-cart"></i>
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>
            <Link href="/#cursos" className="btn-primary btn-sm">
              Inscríbete
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
