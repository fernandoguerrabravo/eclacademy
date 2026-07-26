import Link from "next/link";
import { brand } from "@/lib/brand";
import { EvolmindHeaderAccess } from "@/components/admin/EvolmindHeaderAccess";

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
            <span>{brand.namePrefix} <strong>Admin</strong></span>
          </Link>
          <div className="admin-header-actions">
            <EvolmindHeaderAccess />
            <Link href="/" className="admin-header-link">
              <i className="fas fa-arrow-up-right-from-square"></i> Ver sitio
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
