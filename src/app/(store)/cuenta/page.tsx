import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Footer } from "@/components/Footer";
import { AccountCourseCard } from "@/components/AccountCourseCard";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.userId },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="account-page container">
        <div className="account-header">
          <div className="account-avatar">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>Hola, {session.name.split(" ")[0]}</h1>
            <p>{session.email}</p>
          </div>
        </div>

        {/* Mis cursos */}
        <section className="account-section">
          <h2>Mis Cursos</h2>
          {enrollments.length === 0 ? (
            <div className="account-empty">
              <i className="fas fa-book-open"></i>
              <p>Aún no tienes cursos. ¡Explora nuestro catálogo!</p>
              <Link href="/#cursos" className="btn-primary">
                Ver cursos
              </Link>
            </div>
          ) : (
            <div className="account-courses">
              {enrollments.map((e) => (
                <AccountCourseCard
                  key={e.id}
                  enrollmentId={e.id}
                  title={e.course.title}
                  icon={e.course.icon}
                  synced={e.evolmindSynced}
                />
              ))}
            </div>
          )}
        </section>

        {/* Historial de compras */}
        <section className="account-section">
          <h2>Historial de Compras</h2>
          {orders.length === 0 ? (
            <p className="account-muted">No tienes compras registradas.</p>
          ) : (
            <div className="account-orders">
              {orders.map((o) => (
                <div className="account-order" key={o.id}>
                  <div className="account-order-head">
                    <span className="order-id">
                      Orden #{o.id.slice(0, 8)}
                    </span>
                    <span className={`order-status status-${o.status.toLowerCase()}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="account-order-items">
                    {o.items.map((it) => (
                      <span key={it.id}>{it.title}</span>
                    ))}
                  </div>
                  <div className="account-order-foot">
                    <span>{new Date(o.createdAt).toLocaleDateString("es")}</span>
                    <strong>${o.total}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
