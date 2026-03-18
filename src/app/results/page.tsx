"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReliabilityCard as ReliabilityCardType } from "@/types/reliability";

function CardBlock({ card }: { card: ReliabilityCardType }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{card.companyName}</h1>
        <p className="mt-2 text-[var(--muted)]">{card.question}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[var(--accent)]">{card.evidenceScore}</span>
            <span className="text-[var(--muted)]">/ 100</span>
          </div>
          <p className="text-sm text-[var(--muted)]">{card.evidenceScoreRationale}</p>
        </div>
      </section>

      {card.sourceQualitySummary && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Source Quality</h2>
          <div className="mt-2 flex gap-6 text-sm text-[var(--muted)]">
            <span>Primary: {card.sourceQualitySummary.primarySources}</span>
            <span>Secondary: {card.sourceQualitySummary.secondarySources}</span>
            <span>Unknown: {card.sourceQualitySummary.unknown}</span>
          </div>
        </section>
      )}

      {card.evidenceLedger?.length > 0 && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Evidence Ledger</h2>
          <ul className="mt-3 space-y-3">
            {card.evidenceLedger.slice(0, 5).map((entry, i) => (
              <li key={i} className="border-l-2 border-[var(--card-border)] pl-3 text-sm">
                <p className="font-medium text-[var(--foreground)]">{entry.claim}</p>
                <span className={entry.confidence >= 0.7 ? "text-[var(--success)]" : entry.confidence >= 0.4 ? "text-[var(--warning)]" : "text-[var(--danger)]"}>
                  Confidence {(entry.confidence * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.missingCoverage?.length > 0 && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Coverage Gaps</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {card.missingCoverage.slice(0, 3).map((item, i) => (
              <li key={i}>
                <span className="font-medium text-[var(--foreground)]">{item.area}</span>
                <span className="text-[var(--muted)]"> — {item.whatToCheck}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.diligenceQuestions?.length > 0 && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Diligence Questions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {card.diligenceQuestions.slice(0, 4).map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${q.priority === "P0" ? "bg-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--muted)]/20 text-[var(--muted)]"}`}>
                  {q.priority}
                </span>
                <span className="text-[var(--foreground)]">{q.question}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {card.redFlags?.length > 0 && (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Red Flags</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {card.redFlags.slice(0, 3).map((item, i) => (
              <li key={i}>
                <span className={`rounded px-1.5 py-0.5 text-xs ${item.severity === "high" ? "bg-[var(--danger)]/20 text-[var(--danger)]" : "bg-[var(--warning)]/20 text-[var(--warning)]"}`}>
                  {item.severity}
                </span>
                <span className="ml-2 text-[var(--foreground)]">{item.risk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : [];

  const [cards, setCards] = useState<ReliabilityCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        fetch(`/api/reliability/${id}`).then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
      )
    )
      .then((data) => setCards(data.map((d: { card: ReliabilityCardType }) => d.card)))
      .catch(() => setError("Failed to load cards."))
      .finally(() => setLoading(false));
  }, [ids.join(",")]);

  if (ids.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--muted)]">No result IDs provided.</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Home</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    );
  }

  if (error || cards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error || "Cards not found."}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Home</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-[var(--accent)] hover:underline">
            ← Deal Lens
          </Link>
          <span className="text-sm text-[var(--muted)]">{cards.length} cards</span>
        </header>

        <div className="space-y-12">
          {cards.map((card, i) => (
            <div key={i}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--muted)]">Question {i + 1}</span>
                <Link
                  href={`/r/${ids[i]}`}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  View full →
                </Link>
              </div>
              <CardBlock card={card} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    }>
      <ResultsContent />
    </Suspense>
  );
}
