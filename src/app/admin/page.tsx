import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!isAdminServer()) {
    redirect("/admin/login");
  }
  return <AdminDashboard />;
}
