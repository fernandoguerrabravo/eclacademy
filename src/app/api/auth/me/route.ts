import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET /api/auth/me -> usuario de la sesión actual (o null)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
    },
  });
}
