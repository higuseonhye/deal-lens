import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeCompany(name: string) {
  return decodeURIComponent(name).trim().toLowerCase();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { company: string } }
) {
  try {
    const searchKey = normalizeCompany(params.company);

    const allRecords = await prisma.reliabilityCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { nextActions: true },
    });

    const cards = allRecords
      .filter((r) => normalizeCompany(r.companyName) === searchKey)
      .map((r) => {
        let card: Record<string, unknown> = {};
        try {
          card = JSON.parse(r.cardJson);
        } catch {}
        return {
          id: r.id,
          companyName: r.companyName,
          question: r.question,
          createdAt: r.createdAt,
          cardJson: card,
          nextActions: r.nextActions,
        };
      });

    // Aggregate all next actions (from DB - trackable) + from cardJson for cards that might not have been synced
    const allNextActions: Array<{
      id?: string;
      action: string;
      owner: string;
      expectedTime: string;
      status: string;
      evidence: string | null;
      cardId: string;
      cardQuestion: string;
    }> = [];

    for (const c of cards) {
      for (const na of c.nextActions) {
        allNextActions.push({
          id: na.id,
          action: na.action,
          owner: na.owner,
          expectedTime: na.expectedTime,
          status: na.status,
          evidence: na.evidence,
          cardId: na.cardId,
          cardQuestion: c.question,
        });
      }
      // Backfill from cardJson if no DB next actions
      if (c.nextActions.length === 0 && Array.isArray((c.cardJson as { nextActions?: unknown[] }).nextActions)) {
        const fromCard = (c.cardJson as { nextActions: Array<{ action: string; owner: string; expectedTime: string }> })
          .nextActions;
        for (const a of fromCard) {
          allNextActions.push({
            action: a.action,
            owner: a.owner,
            expectedTime: a.expectedTime,
            status: "todo",
            evidence: null,
            cardId: c.id,
            cardQuestion: c.question,
          });
        }
      }
    }

    return NextResponse.json({
      companyName: cards[0]?.companyName ?? decodeURIComponent(params.company),
      cards,
      nextActions: allNextActions,
    });
  } catch (err) {
    console.error("Deal API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
