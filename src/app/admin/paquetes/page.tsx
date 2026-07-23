import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { BundlesManager } from "@/components/admin/BundlesManager";

export const dynamic = "force-dynamic";

export default function AdminBundlesPage() {
  if (!isAdminServer()) redirect("/admin/login");
  return <BundlesManager />;
}
