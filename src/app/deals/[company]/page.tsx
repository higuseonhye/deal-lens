"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface NextActionItem {
  id?: string;
  action: string;
  owner: string;
  expectedTime: string;
  status: string;
  evidence: string | null;
  cardId: string;
  cardQuestion: string;
}

interface CardItem {
  id: string;
  companyName: string;
  question: string;
  createdAt: string;
  cardJson: { evidenceScore?: number };
}

export default function DealPage() {
  const params = useParams();
  const company = params?.company as string;
  const [data, setData] = useState<{
    companyName: string;
    cards: CardItem[];
    nextActions: NextActionItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState("");

  useEffect(() => {
    if (!company) return;
    fetch(`/api/deals/${encodeURIComponent(company)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("딜을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [company]);

  async function updateActionStatus(actionId: string, status: string, evidence?: string) {
    if (!actionId) return; // Backfilled actions from cardJson don't have id
    try {
      await fetch(`/api/next-actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, evidence }),
      });
      if (data) {
        setData({
          ...data,
          nextActions: data.nextActions.map((na) =>
            na.id === actionId ? { ...na, status, evidence: evidence ?? na.evidence } : na
          ),
        });
      }
      setEditingAction(null);
      setEvidenceInput("");
    } catch {}
  }

  if (loading || !company) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">로딩 중…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error || "딜을 찾을 수 없습니다."}</p>
        <Link href="/history" className="text-[var(--accent)] hover:underline">
          딜 목록으로
        </Link>
      </main>
    );
  }

  const todoCount = data.nextActions.filter((a) => a.status === "todo").length;
  const doneCount = data.nextActions.filter((a) => a.status === "done").length;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/history" className="text-[var(--accent)] hover:underline">
              ← 딜 목록
            </Link>
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              새 카드
            </Link>
          </div>
        </header>

        <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
          {data.companyName}
        </h1>

        {/* 다음 액션 통합 */}
        {data.nextActions.length > 0 && (
          <section className="mb-10 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              다음 액션 ({todoCount} 남음 / {doneCount} 완료)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              액션 완료 후 증거를 추가하면, 정보 업데이트로 카드를 재평가할 수 있습니다.
            </p>
            <ul className="mt-4 space-y-3">
              {data.nextActions.map((na, i) => (
                <li
                  key={na.id ?? i}
                  className={`rounded-lg border p-4 ${
                    na.status === "done"
                      ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                      : "border-[var(--card-border)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${na.status === "done" ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>
                        {na.action}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {na.owner} · {na.expectedTime} · 질문: {na.cardQuestion.slice(0, 40)}…
                      </p>
                      {na.evidence && (
                        <p className="mt-2 rounded bg-[var(--success)]/10 px-2 py-1.5 text-sm text-[var(--foreground)]">
                          ✓ {na.evidence}
                        </p>
                      )}
                      {editingAction === na.id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={evidenceInput}
                            onChange={(e) => setEvidenceInput(e.target.value)}
                            placeholder="발견한 증거/결과 입력"
                            className="flex-1 rounded border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => updateActionStatus(na.id!, "done", evidenceInput)}
                            className="rounded bg-[var(--success)] px-3 py-2 text-sm text-white"
                          >
                            완료
                          </button>
                          <button
                            onClick={() => {
                              setEditingAction(null);
                              setEvidenceInput("");
                            }}
                            className="rounded border border-[var(--card-border)] px-3 py-2 text-sm"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {na.status === "done" ? (
                        <span className="rounded bg-[var(--success)]/20 px-2 py-1 text-xs text-[var(--success)]">
                          완료
                        </span>
                      ) : na.id ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingAction(na.id!);
                              setEvidenceInput(na.evidence ?? "");
                            }}
                            className="rounded border border-[var(--accent)]/50 px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/10"
                          >
                            완료 처리
                          </button>
                          <select
                            value={na.status}
                            onChange={(e) => updateActionStatus(na.id!, e.target.value)}
                            className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs"
                          >
                            <option value="todo">할 일</option>
                            <option value="in_progress">진행 중</option>
                            <option value="done">완료</option>
                          </select>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">(DB 미동기화)</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href={`/?company=${encodeURIComponent(data.companyName)}`}
              className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              정보 업데이트 후 재평가 →
            </Link>
          </section>
        )}

        {/* 카드 목록 */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Reliability Cards
          </h2>
          <ul className="space-y-3">
            {data.cards.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/r/${c.id}`}
                  className="block rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-4 transition-colors hover:bg-[var(--card)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--foreground)]">{c.question}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className="text-xl font-bold text-[var(--accent)]">
                        {c.cardJson?.evidenceScore ?? 0}
                      </span>
                      <span className="text-sm text-[var(--muted)]">/100</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
