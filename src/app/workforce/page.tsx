"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AgentStat {
  id: string;
  name: string;
  type: string;
  model: string | null;
  taskCount: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  totalTokens: number;
  avgLatencyMs: number | null;
}

export default function WorkforcePage() {
  const [agents, setAgents] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workforce")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">로딩 중…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            ← Deal Lens
          </Link>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Workforce (Reputation 시드)
          </h1>
        </header>

        <p className="mb-6 text-sm text-[var(--muted)]">
          AI 에이전트의 성과·비용·정확도가 누적됩니다. AgentOS 확장 시 Reputation 그래프 기반이 됩니다.
        </p>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-8 text-center">
            <p className="text-[var(--muted)]">아직 실행된 에이전트가 없습니다.</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              카드 생성, 질문 생성, 정보 수집을 하면 여기에 기록됩니다.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {agents.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{a.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.type} {a.model && `· ${a.model}`}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      a.successRate >= 90 ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-[var(--warning)]/20 text-[var(--warning)]"
                    }`}
                  >
                    {a.successRate.toFixed(0)}% 성공
                  </span>
                </div>
                <div className="mt-3 flex gap-6 text-sm">
                  <span>
                    <span className="text-[var(--muted)]">태스크</span> {a.taskCount}
                  </span>
                  <span>
                    <span className="text-[var(--muted)]">토큰</span> {a.totalTokens.toLocaleString()}
                  </span>
                  {a.avgLatencyMs != null && (
                    <span>
                      <span className="text-[var(--muted)]">평균</span> {a.avgLatencyMs}ms
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
