"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CardItem {
  id: string;
  question: string;
  evidenceScore: number;
  createdAt: string;
}

interface CompanyItem {
  companyName: string;
  cardCount: number;
  latestScore: number;
  cards: CardItem[];
}

export default function HistoryPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deals")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setCompanies(data.companies ?? []))
      .catch(() => setError("Failed to load saved deals."))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function encodeCompany(name: string) {
    return encodeURIComponent(name);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading…</p>
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
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Deals (by company)</h1>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {companies.length === 0 && !error ? (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-12 text-center">
            <p className="text-[var(--muted)]">No saved deals yet.</p>
            <Link href="/" className="mt-4 inline-block text-[var(--accent)] hover:underline">
              Create your first card →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {companies.map((co) => (
              <li key={co.companyName}>
                <Link
                  href={`/deals/${encodeCompany(co.companyName)}`}
                  className="block rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-4 transition-colors hover:bg-[var(--card)] hover:border-[var(--card-border)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--foreground)]">{co.companyName}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {co.cardCount} cards
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xl font-bold text-[var(--accent)]">
                        {co.latestScore}
                      </span>
                      <span className="text-sm text-[var(--muted)]">/100</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
