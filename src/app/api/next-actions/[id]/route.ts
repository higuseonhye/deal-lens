import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, evidence } = body;

    const updateData: { status?: string; evidence?: string | null } = {};
    if (status === "todo" || status === "in_progress" || status === "done") {
      updateData.status = status;
    }
    if (typeof evidence === "string") {
      updateData.evidence = evidence.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "status or evidence required" }, { status: 400 });
    }

    const nextAction = await prisma.nextAction.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(nextAction);
  } catch (err) {
    console.error("NextAction PATCH error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
