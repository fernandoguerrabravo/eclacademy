import { NextResponse } from "next/server";
import { listDevEmails } from "@/lib/dev-mailbox";

export const dynamic = "force-dynamic";

// GET /api/dev/mailbox -> lista de correos (solo desarrollo)
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }
  return NextResponse.json({ emails: listDevEmails() });
}
