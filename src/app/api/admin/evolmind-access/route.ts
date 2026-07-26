import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyEmail, getAutologinUrl } from "@/lib/evolmind";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/evolmind-access?email=alguien@dominio.com
 * Genera una URL de acceso directo (autologin) al campus de evolCampus para
 * el usuario con ese email. Solo admin. Útil para soporte/demos: "entrar como".
 *
 * Opcional: &groupId=NN &courseId=NN para aterrizar en un curso concreto.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "Falta el parámetro email" }, { status: 400 });
  }

  const groupId = req.nextUrl.searchParams.get("groupId");
  const courseId = req.nextUrl.searchParams.get("courseId");

  const verified = await verifyEmail(email);
  if (!verified.exists || !verified.userId) {
    return NextResponse.json(
      { error: `El email ${email} no existe en evolCampus` },
      { status: 404 }
    );
  }

  const url = await getAutologinUrl(verified.userId, {
    groupId: groupId ? Number(groupId) : undefined,
    courseId: courseId ? Number(courseId) : undefined,
  });

  if (!url) {
    return NextResponse.json(
      { error: "No se pudo generar el acceso (autologin)" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url, userId: verified.userId, name: verified.name });
}
