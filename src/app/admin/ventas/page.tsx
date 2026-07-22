import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { OrdersTable } from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  if (!isAdminServer()) redirect("/admin/login");
  return <OrdersTable />;
}
