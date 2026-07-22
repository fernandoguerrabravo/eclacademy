import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { courses, getCourseBySlug } from "@/lib/courses";
import { CurriculumAccordion } from "@/components/CurriculumAccordion";
import { PurchaseCard } from "@/components/PurchaseCard";
import { Footer } from "@/components/Footer";

// Genera rutas estáticas para todos los cursos
export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const course = getCourseBySlug(params.slug);
  return {
    title: course ? `${course.title} | ECL Academy` : "Curso | ECL Academy",
    description: course?.shortDescription,
  };
}

export default function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const course = getCourseBySlug(params.slug);
  if (!course) notFound();

  const fullStars = Math.floor(course.rating);
  const hasHalf = course.rating % 1 >= 0.5;
  const totalMin = course.curriculum.reduce(
    (sum, s) =>
      sum +
      s.lessons.reduce((ls, l) => {
        const [m, sec] = l.duration.split(":").map(Number);
        return ls + m + (sec || 0) / 60;
      }, 0),
    0
  );
  const hours = Math.floor(totalMin / 60);
  const mins = Math.round(totalMin % 60);

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
              <span>{course.students} estudiantes</span>
              <span className="meta-sep">•</span>
              <span>Última actualización: Mayo 2026</span>
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
              <span><i className="fas fa-closed-captioning"></i> Subtítulos en inglés</span>
              <span><i className="fas fa-certificate"></i> Certificado de finalización</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layout */}
      <div className="course-detail-layout container">
        <div className="course-main">
          {/* What you'll learn */}
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

          {/* Requirements */}
          <section className="detail-section">
            <h2>Requisitos</h2>
            <ul className="requirements-list">
              {course.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </section>

          {/* Curriculum */}
          <section className="detail-section">
            <h2>Contenido del curso</h2>
            <div className="curriculum-stats">
              <span>{course.curriculum.length} secciones</span> •{" "}
              <span>{course.lessons} lecciones</span> •{" "}
              <span>
                {hours}h {mins}m de duración total
              </span>
            </div>
            <CurriculumAccordion curriculum={course.curriculum} />
          </section>

          {/* Description */}
          <section className="detail-section">
            <h2>Descripción</h2>
            <div className="description-content">
              <p>{course.description}</p>
              <h3>¿Para quién es este curso?</h3>
              <ul>
                <li>Sellers de Amazon en LATAM que quieren expandirse a Amazon USA</li>
                <li>Emprendedores con productos listos para exportar</li>
                <li>Dueños de marcas que buscan ingresar al mercado estadounidense</li>
                <li>Profesionales de comercio exterior que quieren especializarse</li>
              </ul>
            </div>
          </section>

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
              <div className="instructor-stats">
                <span><i className="fas fa-star"></i> 4.8 calificación del instructor</span>
                <span><i className="fas fa-comment"></i> 1,245 reseñas</span>
                <span><i className="fas fa-user-graduate"></i> 500+ estudiantes</span>
                <span><i className="fas fa-play-circle"></i> 6 cursos</span>
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
