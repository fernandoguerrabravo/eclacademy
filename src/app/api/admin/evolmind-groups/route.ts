import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import { createGroup, updateGroup } from "@/lib/evolmind";

/**
 * POST /api/admin/evolmind-groups
 * Crea un grupo en evolCampus para un curso existente y (opcional) lo enlaza
 * como grupo de matrícula de un curso local.
 *
 * Body: {
 *   evolmindCourseId: number,   // curso en evolCampus
 *   name: string,
 *   type: "A" | "S",
 *   daysDuration?: number,      // asíncrono
 *   startDate?: string,         // síncrono (Y-m-d)
 *   endDate?: string,           // síncrono (Y-m-d)
 *   linkToCourseId?: number     // curso local a enlazar con el grupo creado
 * }
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const evolmindCourseId = Number(body.evolmindCourseId);
    if (!evolmindCourseId || !body.name || !body.type) {
      return NextResponse.json(
        { error: "evolmindCourseId, name y type son requeridos" },
        { status: 400 }
      );
    }
    if (body.type === "A" && !body.daysDuration) {
      return NextResponse.json(
        { error: "daysDuration es requerido para grupos asíncronos" },
        { status: 400 }
      );
    }
    if (body.type === "S" && (!body.startDate || !body.endDate)) {
      return NextResponse.json(
        { error: "startDate y endDate son requeridos para grupos síncronos" },
        { status: 400 }
      );
    }

    const result = await createGroup({
      courseId: evolmindCourseId,
      name: body.name,
      type: body.type,
      daysDuration: body.daysDuration ? Number(body.daysDuration) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      classHours: body.classHours ? Number(body.classHours) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    // Si se pide, enlaza el grupo recién creado al curso local
    let linkedCourse = null;
    if (body.linkToCourseId && result.groupId) {
      linkedCourse = await prisma.course.update({
        where: { id: Number(body.linkToCourseId) },
        data: {
          evolmindCourseId,
          evolmindGroupId: result.groupId,
          evolmindSynced: true,
          evolmindError: null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      groupId: result.groupId,
      message: result.message,
      linkedCourse: linkedCourse
        ? { id: linkedCourse.id, evolmindGroupId: linkedCourse.evolmindGroupId }
        : null,
    });
  } catch (error) {
    console.error("[admin:evolmind-groups] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/evolmind-groups
 * Modifica un grupo existente en evolCampus.
 * Body: { groupId, name?, daysDuration?, startDate?, endDate?, classHours? }
 */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const groupId = Number(body.groupId);
    if (!groupId) {
      return NextResponse.json({ error: "groupId requerido" }, { status: 400 });
    }
    const result = await updateGroup(groupId, {
      name: body.name,
      daysDuration: body.daysDuration ? Number(body.daysDuration) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      classHours: body.classHours ? Number(body.classHours) : undefined,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    console.error("[admin:evolmind-groups:PATCH] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
