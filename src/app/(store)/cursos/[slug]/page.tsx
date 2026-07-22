import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getStoreCourseBySlug } from "@/lib/courses-db";
import { PurchaseCard } from "@/components/PurchaseCard";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const course = await getStoreCourseBySlug(params.slug);
  return {
    title: course ? `${course.title} | ECL Academy` : "Curso | ECL Academy",
    description: course?.shortDescription,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const course = await getStoreCourseBySlug(params.slug);
  if (!course) notFound();

  const fullStars = Math.floor(course.rating);
  const hasHalf = course.rating % 1 >= 0.5;

  return (
    <>
      {/* Header */}
      <section className="course-header">
        <div className="container">
          <div className="course-header-content">
            <nav className="breadcrumb">
              <Link href="/">Inicio</Link> <i className="fas fa-chevron-right"></i>
              <Link href="/#cursos">Cursos</Link>{" "}
              <i className="fas fa-chevron-right"></i>
              <span>{course.category}</span>
            </nav>
            <h1>{course.title}</h1>
            <p className="course-header-desc">{course.description}</p>
            <div className="course-header-meta">
              {course.rating > 0 && (
                <>
                  <div className="rating-inline">
                    <span className="rating-number">{course.rating}</span>
                    <div className="stars">
                      {Array.from({ length: fullStars }).map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                      {hasHalf && <i className="fas fa-star-half-alt"></i>}
                    </div>
                    <span>({course.reviews} calificaciones)</span>
                  </div>
                  <span className="meta-sep">•</span>
                </>
              )}
              {course.students > 0 && (
                <>
                  <span>{course.students} estudiantes</span>
                  <span className="meta-sep">•</span>
                </>
              )}
              <span>Impartido por Ecommerce Logistics LLC</span>
            </div>
            <div className="course-header-instructor">
              <Image
                src="/logoecl.png"
                alt="ECL"
                width={28}
                height={28}
                className="instructor-avatar"
              />
              <span>
                Creado por <strong>Ecommerce Logistics LLC</strong>
              </span>
            </div>
            <div className="course-header-tags">
              <span><i className="fas fa-globe"></i> Español</span>
              <span><i className="fas fa-certificate"></i> Certificado de finalización</span>
              <span><i className="fas fa-infinity"></i> Acceso al campus evolCampus</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layout */}
      <div className="course-detail-layout container">
        <div className="course-main">
          {/* Lo que aprenderás */}
          {course.whatYouLearn.length > 0 && (
            <section className="detail-section learn-section">
              <h2>Lo que aprenderás</h2>
              <div className="learn-grid">
                {course.whatYouLearn.map((item, i) => (
                  <div className="learn-item" key={i}>
                    <i className="fas fa-check"></i>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Requisitos */}
          {course.requirements.length > 0 && (
            <section className="detail-section">
              <h2>Requisitos</h2>
              <ul className="requirements-list">
                {course.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Descripción */}
          <section className="detail-section">
            <h2>Descripción</h2>
            <div className="description-content">
              <p>{course.description}</p>
              {course.audience.length > 0 && (
                <>
                  <h3>¿Para quién es este curso?</h3>
                  <ul>
                    {course.audience.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          {/* Contenido del curso (asignaturas de evolCampus) */}
          {course.subjects.length > 0 && (
            <section className="detail-section">
              <h2>Contenido del curso</h2>
              <div className="curriculum-stats">
                <span>{course.subjects.length} asignaturas</span>
              </div>
              <div className="curriculum-accordion">
                {course.subjects.map((s, idx) => (
                  <div className="accordion-section" key={idx}>
                    <div className="accordion-header" style={{ cursor: "default" }}>
                      <div className="accordion-title">
                        <i className="fas fa-book"></i>
                        <strong>{s.subject}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Instructor */}
          <section className="detail-section">
            <h2>Instructor</h2>
            <div className="instructor-card">
              <div className="instructor-info">
                <Image
                  src="/logoecl.png"
                  alt="Ecommerce Logistics LLC"
                  width={60}
                  height={60}
                  className="instructor-img"
                />
                <div>
                  <h3>Ecommerce Logistics LLC</h3>
                  <p className="instructor-title">
                    Amazon Service Partner | Expertos en Comercio Internacional
                  </p>
                </div>
              </div>
              <p className="instructor-bio">
                Ecommerce Logistics LLC es una agencia oficial de Amazon (Service
                Partner Network) especializada en ayudar a sellers de
                Latinoamérica a ingresar exitosamente al mercado de Estados
                Unidos. Con presencia en Miami, Florida, nuestro equipo de
                expertos en comercio internacional, aduanas y logística ha
                capacitado a más de 500 sellers en 12 países.
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="course-sidebar">
          <PurchaseCard course={course} />
        </aside>
      </div>

      <Footer />
    </>
  );
}
