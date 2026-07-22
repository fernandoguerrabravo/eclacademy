import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { EnrollmentsTable } from "@/components/admin/EnrollmentsTable";

export const dynamic = "force-dynamic";

export default function AdminEnrollmentsPage() {
  if (!isAdminServer()) redirect("/admin/login");
  return <EnrollmentsTable />;
}
