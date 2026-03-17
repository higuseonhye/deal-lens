import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeCompany(name: string) {
  return name.trim().toLowerCase();
}

export async function GET() {
  try {
    const records = await prisma.reliabilityCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        companyName: true,
        question: true,
        createdAt: true,
        cardJson: true,
      },
    });

    // Group by company (normalized)
    const byCompany = new Map<
      string,
      { companyName: string; cards: Array<{ id: string; question: string; evidenceScore: number; createdAt: string }> }
    >();

    for (const r of records) {
      const key = normalizeCompany(r.companyName);
      const displayName = r.companyName.trim();
      if (!byCompany.has(key)) {
        byCompany.set(key, { companyName: displayName, cards: [] });
      }
      let evidenceScore = 0;
      try {
        const card = JSON.parse(r.cardJson);
        evidenceScore = card.evidenceScore ?? 0;
      } catch {}
      byCompany.get(key)!.cards.push({
        id: r.id,
        question: r.question,
        evidenceScore,
        createdAt: r.createdAt.toISOString(),
      });
    }

    const companies = Array.from(byCompany.values()).map((c) => ({
      companyName: c.companyName,
      cardCount: c.cards.length,
      latestScore: Math.max(...c.cards.map((x) => x.evidenceScore), 0),
      cards: c.cards,
    }));

    return NextResponse.json({ companies });
  } catch (err) {
    console.error("Deals API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
