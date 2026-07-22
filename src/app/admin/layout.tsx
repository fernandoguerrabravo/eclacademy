import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link href="/admin" className="admin-brand">
            <i className="fas fa-graduation-cap"></i>
            <span>ECL <strong>Admin</strong></span>
          </Link>
          <Link href="/" className="admin-header-link">
            <i className="fas fa-arrow-up-right-from-square"></i> Ver sitio
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
