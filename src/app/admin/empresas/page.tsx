import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { CompaniesManager } from "@/components/admin/CompaniesManager";

export const dynamic = "force-dynamic";

export default function AdminCompaniesPage() {
  if (!isAdminServer()) redirect("/admin/login");
  return <CompaniesManager />;
}
