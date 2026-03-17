import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.reliabilityCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        companyName: true,
        question: true,
        createdAt: true,
        cardJson: true,
      },
    });

    const items = records.map((r) => {
      let evidenceScore = 0;
      try {
        const card = JSON.parse(r.cardJson);
        evidenceScore = card.evidenceScore ?? 0;
      } catch {}
      return {
        id: r.id,
        companyName: r.companyName,
        question: r.question,
        evidenceScore,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({ cards: items });
  } catch (err) {
    console.error("History API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
