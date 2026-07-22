import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  destroySession();
  return NextResponse.json({ ok: true });
}
