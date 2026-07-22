"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { StoreCourse } from "@/lib/courses-db";

const badgeLabels: Record<string, string> = {
  bestseller: "Más Vendido",
  new: "Nuevo",
  popular: "Popular",
};

export function CourseCard({ course }: { course: StoreCourse }) {
  const { addItem } = useCart();

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem(course.id);
  }

  const fullStars = Math.floor(course.rating);
  const hasHalf = course.rating % 1 >= 0.5;

  return (
    <Link href={`/cursos/${course.slug}`} className="course-card">
      <div className="course-thumb">
        <i className={`fas ${course.icon}`}></i>
        {course.badge && (
          <span className={`course-badge ${course.badge}`}>
            {badgeLabels[course.badge]}
          </span>
        )}
      </div>
      <div className="course-body">
        <h3>{course.title}</h3>
        <p className="course-instructor">Por Ecommerce Logistics LLC</p>
        <div className="course-rating">
          <span className="rating-number">{course.rating}</span>
          <div className="stars">
            {Array.from({ length: fullStars }).map((_, i) => (
              <i key={i} className="fas fa-star"></i>
            ))}
            {hasHalf && <i className="fas fa-star-half-alt"></i>}
          </div>
          <span className="rating-count">({course.reviews})</span>
        </div>
        <div className="course-meta-tags">
          <span>{course.weeks} semanas</span>
          <span>{course.lessons} lecciones</span>
          <span>Certificado</span>
        </div>
        <div className="course-price-row">
          <span className="price-current">${course.price}</span>
          <span className="price-old">${course.originalPrice}</span>
        </div>
        <button className="btn-add-cart" onClick={handleAdd}>
          <i className="fas fa-cart-plus"></i> Agregar al carrito
        </button>
      </div>
    </Link>
  );
}
