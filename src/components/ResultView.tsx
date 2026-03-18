"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReliabilityCard as ReliabilityCardType } from "@/types/reliability";

export default function ResultView() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [card, setCard] = useState<ReliabilityCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reliability/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setCard(data.card))
      .catch(() => setError("Failed to load card."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !id || id === "undefined") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error || "Card not found."}</p>
        <Link href="/" className="text-[var(--accent)] hover:underline">Back to Home</Link>
      </main>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const hasLowEvidence = card.evidenceScore < 40 || (card.sourceQualitySummary?.unknown ?? 0) > 0;
  const unverifiedCount = card.evidenceLedger?.filter((e) => e.confidence < 0.5).length ?? 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--accent)] hover:underline">
              ← Deal Lens
            </Link>
            <Link href="/history" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              Deals
            </Link>
            <Link href="/workforce" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
              Workforce
            </Link>
            <Link
              href={`/deals/${encodeURIComponent(card.companyName)}`}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {card.companyName} Deal
            </Link>
          </div>
          <button
            onClick={copyLink}
            className="rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </header>

        {/* Insufficient/unverified evidence warning */}
        {(hasLowEvidence || unverifiedCount > 0) && (
          <div className="mb-6 rounded-xl border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-4 py-3">
            <p className="text-sm font-medium text-[var(--warning)]">
              ⚠️ Insufficient or unverified evidence included
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {hasLowEvidence && `Evidence score ${card.evidenceScore} — `}
              {unverifiedCount > 0 && `${unverifiedCount} claims below 50% confidence — `}
              Check sources and confidence in the Evidence Ledger below.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Header card */}
          <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{card.companyName}</h1>
            <p className="mt-2 text-[var(--muted)]">{card.question}</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${card.evidenceScore >= 60 ? "text-[var(--accent)]" : card.evidenceScore >= 40 ? "text-[var(--warning)]" : "text-[var(--danger)]"}`}>
                  {card.evidenceScore}
                </span>
                <span className="text-[var(--muted)]">/ 100</span>
              </div>
              <p className="text-sm text-[var(--muted)]">{card.evidenceScoreRationale}</p>
            </div>
          </section>

          {/* Source Quality */}
          {card.sourceQualitySummary && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Source Quality</h2>
              <div className="mt-3 flex gap-6 text-sm">
                <span>Primary: {card.sourceQualitySummary.primarySources}</span>
                <span>Secondary: {card.sourceQualitySummary.secondarySources}</span>
                <span className={card.sourceQualitySummary.unknown > 0 ? "text-[var(--warning)]" : ""}>
                  Unknown: {card.sourceQualitySummary.unknown}
                </span>
              </div>
              {card.sourceQualitySummary.notes && (
                <p className="mt-2 text-[var(--muted)]">{card.sourceQualitySummary.notes}</p>
              )}
            </section>
          )}

          {/* Evidence Ledger */}
          {card.evidenceLedger?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Evidence Ledger</h2>
              <ul className="mt-4 space-y-4">
                {card.evidenceLedger.map((entry, i) => (
                  <li
                    key={i}
                    className={`border-l-2 pl-4 ${
                      entry.confidence >= 0.7
                        ? "border-[var(--success)]"
                        : entry.confidence >= 0.4
                        ? "border-[var(--warning)]"
                        : "border-[var(--danger)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--foreground)]">{entry.claim}</p>
                    {entry.snippet && (
                      <p className="mt-1 text-sm text-[var(--muted)]">&ldquo;{entry.snippet}&rdquo;</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span
                        className={
                          entry.confidence >= 0.7
                            ? "text-[var(--success)]"
                            : entry.confidence >= 0.4
                            ? "text-[var(--warning)]"
                            : "text-[var(--danger)]"
                        }
                      >
                        {entry.confidence >= 0.7
                          ? "✓ Verified"
                          : entry.confidence >= 0.4
                          ? "△ Partial"
                          : "✗ Unverified"}
                        {" "}({(entry.confidence * 100).toFixed(0)}%)
                      </span>
                      {entry.sourceUrl && (
                        <a
                          href={entry.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] hover:underline"
                        >
                          Source
                        </a>
                      )}
                      {!entry.sourceUrl && entry.confidence < 0.5 && (
                        <span className="text-[var(--danger)]">No source</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Missing Coverage */}
          {card.missingCoverage?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Coverage Gaps</h2>
              <ul className="mt-4 space-y-4">
                {card.missingCoverage.map((item, i) => (
                  <li key={i} className="rounded-lg border border-[var(--card-border)] p-4">
                    <p className="font-medium text-[var(--foreground)]">{item.area}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.whyItMatters}</p>
                    <p className="mt-1 text-sm text-[var(--accent)]">Check: {item.whatToCheck}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Contradiction Flags */}
          {card.contradictionFlags?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Contradiction Flags</h2>
              <ul className="mt-4 space-y-4">
                {card.contradictionFlags.map((item, i) => (
                  <li key={i} className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4">
                    <p className="font-medium text-[var(--foreground)]">{item.flag}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.whyItMatters}</p>
                    <p className="mt-1 text-sm text-[var(--accent)]">Resolve: {item.howToResolve}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Diligence Questions */}
          {card.diligenceQuestions?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Diligence Questions</h2>
              <ul className="mt-4 space-y-4">
                {card.diligenceQuestions.map((q, i) => (
                  <li key={i} className="rounded-lg border border-[var(--card-border)] p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          q.priority === "P0"
                            ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                            : q.priority === "P1"
                            ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                            : "bg-[var(--muted)]/20 text-[var(--muted)]"
                        }`}
                      >
                        {q.priority}
                      </span>
                      <p className="font-medium text-[var(--foreground)]">{q.question}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">{q.whyThisQuestion}</p>
                    <p className="mt-1 text-sm text-[var(--accent)]">Expected evidence: {q.expectedEvidence}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Red Flags */}
          {card.redFlags?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Red Flags</h2>
              <ul className="mt-4 space-y-3">
                {card.redFlags.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                        item.severity === "high"
                          ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                          : item.severity === "medium"
                          ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                          : "bg-[var(--muted)]/20 text-[var(--muted)]"
                      }`}
                    >
                      {item.severity}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{item.risk}</p>
                      <p className="text-sm text-[var(--muted)]">{item.reasoning}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Assumptions */}
          {card.assumptions?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Assumptions</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                {card.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Next Actions */}
          {card.nextActions?.length > 0 && (
            <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Next Actions</h2>
              <ul className="mt-4 space-y-2">
                {card.nextActions.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="rounded bg-[var(--accent)]/20 px-2 py-0.5 text-[var(--accent)]">
                      {a.owner}
                    </span>
                    <span className="text-[var(--foreground)]">{a.action}</span>
                    <span className="text-[var(--muted)]">{a.expectedTime}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
