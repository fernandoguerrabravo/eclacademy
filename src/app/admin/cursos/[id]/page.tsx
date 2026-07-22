import { redirect } from "next/navigation";
import { isAdminServer } from "@/lib/admin-auth";
import { CourseEditor } from "@/components/admin/CourseEditor";

export const dynamic = "force-dynamic";

export default function AdminCourseEditPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isAdminServer()) redirect("/admin/login");
  return <CourseEditor courseId={Number(params.id)} />;
}
