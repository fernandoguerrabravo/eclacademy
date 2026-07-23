import { notFound } from "next/navigation";
import Link from "next/link";
import { getStoreBundleBySlug } from "@/lib/bundles-db";
import { BundleBuyButton } from "@/components/BundleBuyButton";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const bundle = await getStoreBundleBySlug(params.slug);
  return {
    title: bundle ? `${bundle.title} | ECL Academy` : "Paquete | ECL Academy",
    description: bundle?.shortDescription,
  };
}

export default async function BundleDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const bundle = await getStoreBundleBySlug(params.slug);
  if (!bundle) notFound();

  const savings = bundle.originalPrice - bundle.price;
  const discount =
    bundle.originalPrice > 0
      ? Math.round((savings / bundle.originalPrice) * 100)
      : 0;

  return (
    <>
      <section className="course-header">
        <div className="container">
          <div className="course-header-content">
            <nav className="breadcrumb">
              <Link href="/">Inicio</Link> <i className="fas fa-chevron-right"></i>
              <span>Paquetes</span>
            </nav>
            <span className="bundle-tag"><i className="fas fa-layer-group"></i> Paquete · {bundle.courses.length} cursos</span>
            <h1>{bundle.title}</h1>
            <p className="course-header-desc">{bundle.description}</p>
          </div>
        </div>
      </section>

      <div className="course-detail-layout container">
        <div className="course-main">
          <section className="detail-section">
            <h2>Cursos incluidos</h2>
            <div className="bundle-courses">
              {bundle.courses.map((c) => (
                <Link key={c.id} href={`/cursos/${c.slug}`} className="bundle-course-item">
                  <span className="bundle-course-icon">
                    <i className={`fas ${c.icon}`}></i>
                  </span>
                  <span>{c.title}</span>
                  <i className="fas fa-chevron-right bundle-course-arrow"></i>
                </Link>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h2>Descripción</h2>
            <div className="description-content">
              <p>{bundle.description}</p>
            </div>
          </section>
        </div>

        <aside className="course-sidebar">
          <div className="purchase-card">
            <div className="purchase-preview">
              <div className="preview-thumb">
                <i className="fas fa-layer-group"></i>
              </div>
            </div>
            <div className="purchase-body">
              <div className="purchase-price">
                <span className="price-main">${bundle.price}</span>
                {bundle.originalPrice > bundle.price && (
                  <>
                    <span className="price-old">${bundle.originalPrice}</span>
                    <span className="price-discount">{discount}% dto.</span>
                  </>
                )}
              </div>
              {savings > 0 && (
                <p className="bundle-savings">Ahorras ${savings} comprando el paquete</p>
              )}
              <BundleBuyButton bundleId={bundle.id} />
              <p className="guarantee-text">Acceso a {bundle.courses.length} cursos · Garantía 30 días</p>
              <div className="purchase-includes">
                <h4>Este paquete incluye:</h4>
                <ul>
                  {bundle.courses.map((c) => (
                    <li key={c.id}>
                      <i className="fas fa-circle-check"></i> {c.title}
                    </li>
                  ))}
                  <li><i className="fas fa-certificate"></i> Certificado por curso</li>
                  <li><i className="fas fa-infinity"></i> Acceso al campus evolCampus</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
