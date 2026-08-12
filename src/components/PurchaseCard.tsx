"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { StoreCourse } from "@/lib/courses-db";

export function PurchaseCard({ course }: { course: StoreCourse }) {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discount = Math.round(
    ((course.originalPrice - course.price) / course.originalPrice) * 100
  );

  function handleAddToCart() {
    addItem(course.id);
  }

  /** Convierte una URL de YouTube/Vimeo en su URL de embed. */
  function getEmbedUrl(url: string): string | null {
    // YouTube: watch?v=ID, youtu.be/ID, shorts/ID
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]+)/
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo: vimeo.com/ID
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return null;
  }

  const embedUrl = course.videoUrl ? getEmbedUrl(course.videoUrl) : null;

  async function handleBuyNow() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [course.id] }),
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
    <div className="purchase-card">
      <div className="purchase-preview">
        {embedUrl ? (
          <div className="preview-video">
            <iframe
              src={embedUrl}
              title="Video de presentación"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "200px", border: "none" }}
            />
          </div>
        ) : course.videoUrl ? (
          <div className="preview-video">
            <video
              src={course.videoUrl}
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "200px", objectFit: "cover", background: "#000" }}
            />
          </div>
        ) : (
          <>
            <div className="preview-thumb">
              <i className={`fas ${course.icon}`}></i>
              <button className="play-btn" aria-label="Vista previa del curso">
                <i className="fas fa-play"></i>
              </button>
            </div>
            <p className="preview-text">Vista previa de este curso</p>
          </>
        )}
      </div>
      <div className="purchase-body">
        <div className="purchase-price">
          <span className="price-main">${course.price} <small>USD</small></span>
          <span className="price-old">${course.originalPrice}</span>
          <span className="price-discount">{discount}% dto.</span>
        </div>
        <div className="purchase-timer">
          <i className="fas fa-clock"></i>
          <span>
            <strong>2 días</strong> a este precio
          </span>
        </div>

        {error && (
          <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginBottom: 8 }}>
            {error}
          </p>
        )}

        <button className="btn-enroll" onClick={handleAddToCart}>
          <i className="fas fa-cart-plus"></i> Agregar al carrito
        </button>
        <button
          className="btn-buy-now"
          onClick={handleBuyNow}
          disabled={loading}
        >
          {loading ? "Procesando..." : "Matricularme ahora"}
        </button>
        <p className="guarantee-text">Garantía de devolución de 30 días</p>

        <div className="purchase-includes">
          <h4>Este curso incluye:</h4>
          <ul>
            <li><i className="fas fa-play-circle"></i> {course.lessons} lecciones en video</li>
            <li><i className="fas fa-file-download"></i> Recursos descargables</li>
            <li><i className="fas fa-file-alt"></i> Ejercicios prácticos</li>
            <li><i className="fas fa-infinity"></i> Acceso por {course.weeks} semanas</li>
            <li><i className="fas fa-mobile-alt"></i> Acceso en dispositivos móviles</li>
            <li><i className="fas fa-certificate"></i> Certificado de finalización</li>
            <li><i className="fas fa-users"></i> Comunidad privada de sellers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
