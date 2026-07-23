import Image from "next/image";
import Link from "next/link";
import { getStoreCourses } from "@/lib/courses-db";
import { getStoreBundles } from "@/lib/bundles-db";
import { CourseCard } from "@/components/CourseCard";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

const topics = [
  { icon: "fa-ship", label: "Cumplimiento Aduanero" },
  { icon: "fa-flask", label: "Regulaciones FDA" },
  { icon: "fa-seedling", label: "Cumplimiento USDA" },
  { icon: "fa-truck-fast", label: "Logística & FBA" },
  { icon: "fa-coins", label: "Fintech & Contabilidad" },
  { icon: "fa-file-contract", label: "Tratados Comerciales" },
  { icon: "fa-store", label: "Amazon Seller Central" },
  { icon: "fa-globe-americas", label: "Comercio Internacional" },
];

const testimonials = [
  {
    initials: "MG",
    name: "María González",
    country: "Seller desde Colombia",
    text: "Gracias a ECL Academy logré entender todo el proceso aduanero. En 3 meses ya tenía mis productos en los warehouses de Amazon USA.",
  },
  {
    initials: "CR",
    name: "Carlos Ramírez",
    country: "Seller desde México",
    text: "El curso de FDA fue clave para mi marca de suplementos. Sin ECL Academy, habría cometido errores costosos en el registro.",
  },
  {
    initials: "AP",
    name: "Ana Lucía Pérez",
    country: "Seller desde Perú",
    text: "La gestión fintech me ahorró miles de dólares en comisiones. Ahora manejo mis pagos internacionales como un profesional.",
  },
];

export default async function HomePage() {
  const courses = await getStoreCourses();
  const bundles = await getStoreBundles();
  return (
    <>
      {/* Hero */}
      <section className="hero" id="inicio">
        <div className="container hero-container">
          <div className="hero-card">
            <h1>Expande tu Negocio al Mercado de Estados Unidos</h1>
            <p>
              Talleres especializados para sellers de Amazon en Latinoamérica.
              Aprende cumplimiento aduanero, FDA, USDA, logística, fintech y
              comercio internacional con expertos certificados.
            </p>
            <div className="hero-cta">
              <Link href="#cursos" className="btn-primary btn-lg">
                Explorar Cursos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="partners-bar">
        <div className="container">
          <p className="partners-label">Avalados por</p>
          <div className="partners-logos">
            <div className="partner-item">
              <Image
                src="/logoecl.png"
                alt="Ecommerce Logistics LLC"
                width={140}
                height={40}
                className="partner-logo"
                style={{ height: 40, width: "auto" }}
              />
            </div>
            <div className="partner-item">
              <Image
                src="/spn-logo.jpeg"
                alt="Amazon Service Partner Network"
                width={40}
                height={40}
                className="partner-logo"
                style={{ height: 40, width: "auto" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="courses-section" id="cursos">
        <div className="container">
          <div className="section-title-row">
            <h2>Todo lo que Necesitas para Vender en Amazon USA</h2>
            <Link href="#cursos" className="see-all">
              Ver todos <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <p className="section-subtitle">
            Nuestros programas están diseñados por expertos en comercio
            internacional con años de experiencia ayudando a sellers
            latinoamericanos.
          </p>
          {courses.length === 0 ? (
            <p className="section-subtitle">
              Pronto publicaremos nuestros cursos. Vuelve muy pronto.
            </p>
          ) : (
            <div className="courses-carousel">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bundles / Paquetes */}
      {bundles.length > 0 && (
        <section className="bundles-section" id="paquetes">
          <div className="container">
            <div className="section-title-row">
              <h2>Paquetes con descuento</h2>
            </div>
            <p className="section-subtitle">
              Ahorra combinando cursos en un solo programa.
            </p>
            <div className="bundles-grid">
              {bundles.map((b) => {
                const disc =
                  b.originalPrice > 0
                    ? Math.round(((b.originalPrice - b.price) / b.originalPrice) * 100)
                    : 0;
                return (
                  <Link key={b.id} href={`/paquetes/${b.slug}`} className="bundle-card">
                    <div className="bundle-card-head">
                      <span className="bundle-card-icon">
                        <i className={`fas ${b.icon}`}></i>
                      </span>
                      {disc > 0 && <span className="bundle-card-disc">-{disc}%</span>}
                    </div>
                    <h3>{b.title}</h3>
                    <p>{b.shortDescription}</p>
                    <div className="bundle-card-courses">
                      <i className="fas fa-book"></i> {b.courses.length} cursos incluidos
                    </div>
                    <div className="bundle-card-foot">
                      <span className="price-current">${b.price}</span>
                      {b.originalPrice > b.price && (
                        <span className="price-old">${b.originalPrice}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Topics */}
      <section className="topics-section">
        <div className="container">
          <h2>Temas Principales</h2>
          <div className="topics-grid">
            {topics.map((t) => (
              <Link href="#cursos" className="topic-card" key={t.label}>
                <i className={`fas ${t.icon}`}></i>
                <span>{t.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-user-graduate"></i></div>
              <span className="stat-number">500+</span>
              <span className="stat-label">Sellers capacitados</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-globe-americas"></i></div>
              <span className="stat-number">12</span>
              <span className="stat-label">Países en LATAM</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-play-circle"></i></div>
              <span className="stat-number">120+</span>
              <span className="stat-label">Lecciones en video</span>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-trophy"></i></div>
              <span className="stat-number">95%</span>
              <span className="stat-label">Tasa de éxito</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section" id="testimonios">
        <div className="container">
          <h2>Lo que Dicen Nuestros Estudiantes</h2>
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-header">
                  <div className="testimonial-avatar">{t.initials}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <p>{t.country}</p>
                  </div>
                </div>
                <div className="testimonial-stars">
                  <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                </div>
                <p>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agency */}
      <section className="agency-section" id="nosotros">
        <div className="container">
          <div className="agency-content">
            <div className="agency-logos">
              <div className="agency-logo-card">
                <Image
                  src="/logoecl.png"
                  alt="Ecommerce Logistics LLC"
                  width={280}
                  height={80}
                  className="agency-logo ecl-logo"
                  style={{ height: 80, width: "auto" }}
                />
              </div>
              <div className="agency-logo-card">
                <Image
                  src="/spn-logo.jpeg"
                  alt="Amazon Seller Central Partner Network"
                  width={160}
                  height={160}
                  className="agency-logo spn-logo"
                  style={{ height: 160, width: "auto" }}
                />
              </div>
            </div>
            <div className="agency-text">
              <h2>
                Somos <span className="text-amazon">Amazon</span> Service Partner
              </h2>
              <p>
                Ecommerce Logistics LLC es miembro oficial del{" "}
                <strong>Amazon Seller Central Partner Network</strong>. Nuestra
                certificación garantiza que recibes formación avalada por los
                más altos estándares de Amazon para sellers internacionales.
              </p>
              <div className="agency-features">
                <div className="agency-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>Certificados por Amazon</span>
                </div>
                <div className="agency-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>Agencia Oficial Amazon 2026</span>
                </div>
                <div className="agency-feature">
                  <i className="fas fa-check-circle"></i>
                  <span>Soporte especializado LATAM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>¿Listo para Conquistar Amazon USA?</h2>
            <p>
              Únete a cientos de sellers latinoamericanos que ya están generando
              ingresos en el mercado más grande del mundo.
            </p>
            <Link href="#cursos" className="btn-primary btn-lg">
              Comienza Hoy <i className="fas fa-rocket"></i>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
