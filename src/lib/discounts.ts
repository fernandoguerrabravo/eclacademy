import { prisma } from "@/lib/prisma";

export interface DiscountValidation {
  valid: boolean;
  percent?: number;
  reason?: string;
}

/** Valida un código sin consumirlo. */
export async function validateDiscount(
  rawCode: string
): Promise<DiscountValidation> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, reason: "Código vacío" };

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc) return { valid: false, reason: "Código no válido" };
  if (!dc.active) return { valid: false, reason: "Código desactivado" };
  if (dc.expiresAt && dc.expiresAt < new Date())
    return { valid: false, reason: "Código expirado" };
  if (dc.usedCount >= dc.maxUses)
    return { valid: false, reason: "Código ya utilizado" };

  return { valid: true, percent: dc.percent };
}

/** Aplica un porcentaje a un monto (redondeo a entero). */
export function applyPercent(amount: number, percent: number): number {
  const discounted = Math.round(amount * (1 - percent / 100));
  return Math.max(0, discounted);
}

/**
 * Marca un código como usado (idempotente y seguro ante concurrencia).
 * Solo incrementa si aún quedan usos disponibles.
 */
export async function markDiscountUsed(
  rawCode: string,
  email: string,
  orderId: string
): Promise<boolean> {
  const code = rawCode.trim().toUpperCase();
  const result = await prisma.discountCode.updateMany({
    where: { code, usedCount: { lt: prisma.discountCode.fields.maxUses } },
    data: {
      usedCount: { increment: 1 },
      usedByEmail: email,
      usedAt: new Date(),
      orderId,
    },
  });
  return result.count > 0;
}

/** Genera N códigos aleatorios con un % de descuento. */
export async function generateDiscountCodes(params: {
  percent: number;
  quantity: number;
  campaign?: string;
  expiresAt?: Date | null;
  prefix?: string;
}): Promise<string[]> {
  const codes: string[] = [];
  const prefix = (params.prefix || "ECL").toUpperCase().replace(/[^A-Z0-9]/g, "");

  for (let i = 0; i < params.quantity; i++) {
    let code = "";
    // Reintenta si colisiona
    for (let attempt = 0; attempt < 5; attempt++) {
      code = `${prefix}-${randomChunk()}`;
      const exists = await prisma.discountCode.findUnique({ where: { code } });
      if (!exists) break;
    }
    await prisma.discountCode.create({
      data: {
        code,
        percent: params.percent,
        campaign: params.campaign || null,
        expiresAt: params.expiresAt || null,
        maxUses: 1,
      },
    });
    codes.push(code);
  }
  return codes;
}

function randomChunk(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1 ambiguos
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
