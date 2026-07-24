import { NextRequest, NextResponse } from "next/server";
import { getDevEmail } from "@/lib/dev-mailbox";

export const dynamic = "force-dynamic";

// GET /api/dev/mailbox/[id] -> HTML renderizable del correo (solo desarrollo)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("No disponible", { status: 404 });
  }
  const email = getDevEmail(params.id);
  if (!email) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(email.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
