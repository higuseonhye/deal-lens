/**
 * AgentOS: Workforce / Reputation API - agent performance, cost, accuracy
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    const stats = agents.map((agent) => {
      const completed = agent.tasks.filter((t) => t.status === "completed");
      const failed = agent.tasks.filter((t) => t.status === "failed");
      const totalTokens = completed.reduce((sum, t) => sum + (t.tokensUsed ?? 0), 0);
      const avgLatency =
        completed.length > 0
          ? Math.round(
              completed.reduce((sum, t) => sum + (t.latencyMs ?? 0), 0) / completed.length
            )
          : null;

      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        model: agent.model,
        taskCount: agent.tasks.length,
        completedCount: completed.length,
        failedCount: failed.length,
        successRate: agent.tasks.length > 0 ? (completed.length / agent.tasks.length) * 100 : 100,
        totalTokens,
        avgLatencyMs: avgLatency,
      };
    });

    return NextResponse.json({ agents: stats });
  } catch (err) {
    console.error("Workforce API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
