import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { createCompanyWithEvolmind } from "@/lib/companies";

function auth(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

// GET -> lista de empresas con conteo de alumnos
export async function GET(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  const companies = await prisma.company.findMany({
    include: { _count: { select: { enrollments: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      documentId: c.documentId,
      contactEmail: c.contactEmail,
      evolmindCompanyId: c.evolmindCompanyId,
      students: c._count.enrollments,
    })),
  });
}

// POST -> crear empresa (local + evolCampus)
export async function POST(req: NextRequest) {
  const u = auth(req);
  if (u) return u;
  try {
    const { name, documentId, contactEmail } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    const company = await createCompanyWithEvolmind({ name, documentId, contactEmail });
    return NextResponse.json({
      company,
      note: company.evolmindCompanyId
        ? "Empresa creada y registrada en evolCampus."
        : "Empresa creada localmente. No se pudo crear en evolCampus (revisa credenciales).",
    });
  } catch (e) {
    console.error("[admin:companies:POST]", e);
    return NextResponse.json({ error: "Error al crear la empresa" }, { status: 500 });
  }
}
