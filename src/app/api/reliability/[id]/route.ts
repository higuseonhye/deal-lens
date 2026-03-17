import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const record = await prisma.reliabilityCard.findUnique({
    where: { id },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const card = JSON.parse(record.cardJson);
  return NextResponse.json({ id: record.id, card });
}
