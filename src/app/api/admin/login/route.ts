import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/admin-auth";

// POST /api/admin/login  body: { token }
export async function POST(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN no configurado en el servidor" },
      { status: 503 }
    );
  }

  const { token } = await req.json();
  if (!token || token !== adminToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  setAdminCookie();
  return NextResponse.json({ ok: true });
}
