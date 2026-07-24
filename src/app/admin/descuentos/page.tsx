import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { DiscountsManager } from "@/components/admin/DiscountsManager";

export const dynamic = "force-dynamic";

export default function AdminDiscountsPage() {
  if (!isAdminServer()) redirect("/admin/login");
  return <DiscountsManager />;
}
