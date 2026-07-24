import { NextRequest, NextResponse } from "next/server";
import { validateDiscount } from "@/lib/discounts";

export const dynamic = "force-dynamic";

// POST /api/discount/validate  body: { code }
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ valid: false, reason: "Código requerido" });
  }
  const result = await validateDiscount(String(code));
  return NextResponse.json(result);
}
